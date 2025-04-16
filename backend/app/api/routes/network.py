from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Query
from typing import List, Dict, Any, Optional
import networkx as nx
import json
import os
import uuid
import shutil
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.models import Network, Dataset, User
from app.schemas.network import NetworkCreate, NetworkUpdate, Network as NetworkSchema, NetworkData
from app.schemas.data import TieStrengthCalculationMethod
from app.services.network_analysis import NetworkAnalysisService
from app.services.data_service import DataService

router = APIRouter(
    prefix="/network",
    tags=["network"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[NetworkSchema])
async def get_networks(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all network models.
    """
    # Implement authorization filter
    if user.is_superuser:
        query = select(Network)
    else:
        query = select(Network).where(Network.user_id == user.id)
    
    result = await db.execute(query)
    networks = result.scalars().all()
    
    return networks

@router.get("/{network_id}", response_model=NetworkSchema)
async def get_network(
    network_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific network model by ID.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    network = result.scalar_one_or_none()
    
    # Check if network exists
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return network

@router.post("/", response_model=NetworkSchema, status_code=status.HTTP_201_CREATED)
async def create_network(
    dataset_id: int = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    directed: bool = Form(False),
    weighted: bool = Form(False),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new network model from a dataset using tie strength definition.
    """
    try:
        # Get the dataset
        dataset = await DataService.get_dataset(db, dataset_id)
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
        
        # Check dataset authorization
        if dataset.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this dataset")
        
        # Determine file path to use
        file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
        
        # If the dataset is already a network file, we can use it directly
        if dataset.type == "NETWORK":
            if file_path.endswith(".graphml"):
                G = nx.read_graphml(file_path)
            elif file_path.endswith(".gexf"):
                G = nx.read_gexf(file_path)
            elif file_path.endswith(".gml"):
                G = nx.read_gml(file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported network file format")
            
            # Update network properties
            if directed and not G.is_directed():
                G = nx.DiGraph(G)
            elif not directed and G.is_directed():
                G = nx.Graph(G)
        
        # Otherwise, create network from dataset
        else:
            # Load the dataset
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_path)
            elif file_path.endswith(".json"):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                else:
                    raise HTTPException(status_code=400, detail="JSON must contain an array of objects")
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")

            # Check if tie strength definition exists
            if not dataset.tie_strength_definition:
                raise HTTPException(status_code=400, detail="A tie strength definition must be set for the dataset before creating a network")
            
            # Extract definition details
            definition = dataset.tie_strength_definition
            source_col = definition['source_column']
            target_col = definition['target_column']
            calc_method = definition['calculation_method']
            weight_col = definition.get('weight_column')
            is_directed_def = definition.get('directed', False)
            
            # Ensure required columns exist in DataFrame
            required_cols_df = [source_col, target_col]
            if calc_method == TieStrengthCalculationMethod.ATTRIBUTE_VALUE and weight_col:
                required_cols_df.append(weight_col)
            missing_cols_df = [col for col in required_cols_df if col not in df.columns]
            if missing_cols_df:
                raise HTTPException(status_code=400, detail=f"Required columns missing in data file: {', '.join(missing_cols_df)}")
            
            # Create graph based on definition's directed flag or parameter override
            if directed or is_directed_def:
                G = nx.DiGraph()
            else:
                G = nx.Graph()
            
            # Add nodes first (ensure all nodes from source/target exist)
            all_nodes = pd.unique(df[[source_col, target_col]].values.ravel('K'))
            for node_id in all_nodes:
                if not pd.isna(node_id):
                    # Try to find attributes for this node (e.g., from the first occurrence)
                    node_rows = df[(df[source_col] == node_id) | (df[target_col] == node_id)]
                    if not node_rows.empty:
                        node_row = node_rows.iloc[0]
                        node_attrs = {col: node_row[col] for col in df.columns if col not in [source_col, target_col, weight_col]}
                        G.add_node(str(node_id), **node_attrs)
            
            # Calculate weights based on method
            if weighted:
                if calc_method == TieStrengthCalculationMethod.FREQUENCY:
                    # Group by source and target, count occurrences
                    edge_weights = df.groupby([source_col, target_col]).size().reset_index(name='weight')
                elif calc_method == TieStrengthCalculationMethod.ATTRIBUTE_VALUE and weight_col:
                    # Group by source and target, sum the weight column
                    # Ensure weight column is numeric
                    if not pd.api.types.is_numeric_dtype(df[weight_col]):
                        raise HTTPException(status_code=400, detail=f"Weight column '{weight_col}' must be numeric for ATTRIBUTE_VALUE method.")
                    edge_weights = df.groupby([source_col, target_col])[weight_col].sum().reset_index(name='weight')
                else:
                    # Default or unsupported method for weighted - treat as unweighted for now
                    edge_weights = df[[source_col, target_col]].drop_duplicates()
                    edge_weights['weight'] = 1.0  # Assign default weight
                    weighted = False  # Mark as effectively unweighted if method not supported
                
                # Add edges with calculated weights
                for _, row in edge_weights.iterrows():
                    source = row[source_col]
                    target = row[target_col]
                    weight = row['weight']
                    if not pd.isna(source) and not pd.isna(target):
                        G.add_edge(str(source), str(target), weight=float(weight))
            else:
                # Add unweighted edges (unique pairs)
                unique_edges = df[[source_col, target_col]].drop_duplicates()
                for _, row in unique_edges.iterrows():
                    source = row[source_col]
                    target = row[target_col]
                    if not pd.isna(source) and not pd.isna(target):
                        G.add_edge(str(source), str(target))
        
        # Calculate metrics using NetworkAnalysisService
        metrics = NetworkAnalysisService.calculate_network_metrics(G)
        
        # Define a persistent save path for the network
        network_uuid = str(uuid.uuid4())
        network_folder = os.path.join("networks", network_uuid)
        os.makedirs(network_folder, exist_ok=True)
        saved_graph_path = os.path.join(network_folder, "network.graphml")
        
        # Save the graph
        nx.write_graphml(G, saved_graph_path)
        
        # Create new Network instance
        new_network = Network(
            name=name,
            description=description or f"Network created from dataset: {dataset.name}",
            directed=G.is_directed(),
            weighted=weighted,
            user_id=user.id,
            dataset_id=dataset_id,
            file_path=saved_graph_path,
            metrics=metrics["global_metrics"],
            node_count=G.number_of_nodes(),
            edge_count=G.number_of_edges(),
            attributes={
                "tie_strength_definition": definition,
                "dataset_name": dataset.name
            }
        )
        
        # Save to database
        db.add(new_network)
        await db.commit()
        await db.refresh(new_network)
        
        return new_network
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating network: {str(e)}")

@router.put("/{network_id}", response_model=NetworkSchema)
async def update_network(
    network_id: int,
    network_update: NetworkUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Update an existing network model metadata.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    network = result.scalar_one_or_none()
    
    # Check if network exists
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update network attributes
    update_data = network_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(network, key, value)
    
    # Commit changes
    await db.commit()
    await db.refresh(network)
    
    return network

@router.delete("/{network_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network(
    network_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Delete a network model.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    network = result.scalar_one_or_none()
    
    # Check if network exists
    if network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Delete the file at network.file_path if it exists
    if network.file_path and os.path.exists(network.file_path):
        try:
            # If it's a single file
            os.remove(network.file_path)
            
            # Also try to remove the parent folder if it's in our networks directory
            folder_path = os.path.dirname(network.file_path)
            if os.path.basename(os.path.dirname(folder_path)) == "networks":
                shutil.rmtree(folder_path, ignore_errors=True)
        except Exception:
            # If there's an error removing files, just log it and continue with deletion
            print(f"Error removing files for network {network_id}")
    
    # Delete from database
    await db.execute(delete(Network).where(Network.id == network_id))
    await db.commit()
    
    return None

@router.get("/{network_id}/metrics", response_model=Dict[str, Any])
async def get_network_metrics(
    network_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get metrics for a specific network.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Return metrics if already calculated
    if db_network.metrics:
        return {
            "network_id": network_id,
            "global_metrics": db_network.metrics,
            "node_metrics": {}  # In a real implementation, we would retrieve node metrics
        }
    
    # Otherwise, calculate metrics now
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Calculate metrics
        metrics = NetworkAnalysisService.calculate_network_metrics(G)
        
        # Update network with metrics
        db_network.metrics = metrics["global_metrics"]
        await db.commit()
        await db.refresh(db_network)
        
        return {
            "network_id": network_id,
            "global_metrics": metrics["global_metrics"],
            "node_metrics": metrics["node_metrics"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating network metrics: {str(e)}")

@router.post("/{network_id}/metrics/calculate", response_model=Dict[str, Any])
async def calculate_network_metrics(
    network_id: int,
    metrics: List[str] = [],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Calculate specified metrics for a network.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Calculate metrics
        calculated_metrics = NetworkAnalysisService.calculate_network_metrics(G)
        
        # Update network with metrics
        db_network.metrics = calculated_metrics["global_metrics"]
        await db.commit()
        await db.refresh(db_network)
        
        return {
            "network_id": network_id,
            "global_metrics": calculated_metrics["global_metrics"],
            "node_metrics": calculated_metrics["node_metrics"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating network metrics: {str(e)}")

@router.get("/{network_id}/communities", response_model=Dict[str, Any])
async def get_network_communities(
    network_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get community detection results for a specific network.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Check if communities are already calculated
    if db_network.communities:
        return db_network.communities
    
    # Otherwise, calculate communities now
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Detect communities
        communities = NetworkAnalysisService.detect_communities(G, algorithm="louvain")
        
        # Update network with communities
        db_network.communities = communities
        await db.commit()
        await db.refresh(db_network)
        
        return communities
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting communities: {str(e)}")

@router.post("/{network_id}/communities/detect", response_model=Dict[str, Any])
async def detect_communities(
    network_id: int,
    algorithm: str = "louvain",
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Detect communities in a network using the specified algorithm.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Detect communities
        communities = NetworkAnalysisService.detect_communities(G, algorithm=algorithm)
        
        # Update network with communities
        db_network.communities = communities
        await db.commit()
        await db.refresh(db_network)
        
        return communities
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting communities: {str(e)}")

@router.post("/{network_id}/link-prediction", response_model=List[Dict[str, Any]])
async def predict_links(
    network_id: int,
    method: str = "common_neighbors",
    k: int = 10,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Predict potential new links in the network.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Predict links
        predicted_links = NetworkAnalysisService.predict_links(G, method=method, k=k)
        
        # Format results
        results = []
        for source, target, score in predicted_links:
            results.append({
                "source": source,
                "target": target,
                "score": float(score)
            })
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting links: {str(e)}")

@router.get("/{network_id}/data", response_model=Dict[str, Any])
async def get_network_data(
    network_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get the actual network data (nodes and edges) for visualization.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Prepare data for visualization
        vis_data = NetworkAnalysisService.prepare_network_for_visualization(
            G, 
            layout="force",
            node_size_attr="degree" if "degree" in list(G.nodes(data=True))[0][1] else None
        )
        
        # Add network metadata
        vis_data["network_id"] = network_id
        vis_data["name"] = db_network.name
        vis_data["directed"] = db_network.directed
        vis_data["weighted"] = db_network.weighted
        
        return vis_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing network data: {str(e)}")

@router.post("/{network_id}/export", response_model=Dict[str, Any])
async def export_network(
    network_id: int,
    formats: List[str] = ["graphml", "gexf", "json"],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Export the network to various file formats.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Export to requested formats
        export_results = NetworkAnalysisService.export_to_formats(G, formats=formats)
        
        return {
            "network_id": network_id,
            "exports": export_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting network: {str(e)}")

@router.post("/{network_id}/homophily", response_model=Dict[str, Any])
async def calculate_homophily(
    network_id: int,
    attribute: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Calculate homophily metrics for a given node attribute.
    """
    # Fetch network from database
    query = select(Network).where(Network.id == network_id)
    result = await db.execute(query)
    db_network = result.scalar_one_or_none()
    
    # Check if network exists
    if db_network is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    
    # Check authorization
    if db_network.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    try:
        # Load the network from file
        file_path = db_network.file_path
        if not file_path:
            raise HTTPException(status_code=400, detail="Network file path not found")
        
        # Load graph
        if file_path.endswith(".graphml"):
            G = nx.read_graphml(file_path)
        elif file_path.endswith(".gexf"):
            G = nx.read_gexf(file_path)
        elif file_path.endswith(".gml"):
            G = nx.read_gml(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported network file format")
        
        # Calculate homophily
        homophily_metrics = NetworkAnalysisService.calculate_homophily(G, attribute=attribute)
        
        return {
            "network_id": network_id,
            "attribute": attribute,
            "homophily_metrics": homophily_metrics
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating homophily: {str(e)}")

@router.post("/upload", response_model=NetworkSchema, status_code=status.HTTP_201_CREATED)
async def upload_network_file(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    directed: bool = Form(False),
    weighted: bool = Form(False),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Upload a network file (GraphML, GEXF, GML) directly.
    """
    try:
        # Check file extension
        filename = file.filename.lower()
        if not (filename.endswith(".graphml") or filename.endswith(".gexf") or filename.endswith(".gml")):
            raise HTTPException(
                status_code=400, 
                detail="Unsupported file format. Please upload GraphML, GEXF, or GML files."
            )
        
        # Read file content
        content = await file.read()
        
        # Create a temporary file to load the network
        import tempfile
        
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(content)
            temp_path = temp.name
        
        try:
            # Load the graph to validate
            if filename.endswith(".graphml"):
                G = nx.read_graphml(temp_path)
            elif filename.endswith(".gexf"):
                G = nx.read_gexf(temp_path)
            elif filename.endswith(".gml"):
                G = nx.read_gml(temp_path)
            
            # Update directed property if needed
            if directed and not G.is_directed():
                G = nx.DiGraph(G)
            elif not directed and G.is_directed():
                G = nx.Graph(G)
            
            # Define persistent save path
            network_uuid = str(uuid.uuid4())
            network_folder = os.path.join("networks", network_uuid)
            os.makedirs(network_folder, exist_ok=True)
            saved_graph_path = os.path.join(network_folder, filename)
            
            # Save the graph
            if filename.endswith(".graphml"):
                nx.write_graphml(G, saved_graph_path)
            elif filename.endswith(".gexf"):
                nx.write_gexf(G, saved_graph_path)
            elif filename.endswith(".gml"):
                nx.write_gml(G, saved_graph_path)
            
            # Calculate basic network metrics
            metrics = NetworkAnalysisService.calculate_network_metrics(G)
            
            # Create network record
            new_network = Network(
                name=name,
                description=description or f"Uploaded network file: {filename}",
                dataset_id=None,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                directed=G.is_directed(),
                weighted=weighted,
                user_id=user.id,
                file_path=saved_graph_path,
                node_count=G.number_of_nodes(),
                edge_count=G.number_of_edges(),
                metrics=metrics["global_metrics"],
                attributes={
                    "original_filename": filename
                }
            )
            
            # Save to database
            db.add(new_network)
            await db.commit()
            await db.refresh(new_network)
            
            return new_network
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading network file: {str(e)}")