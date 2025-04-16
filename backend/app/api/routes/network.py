from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
import networkx as nx
import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.user import User
from app.services.network_analysis import NetworkAnalysisService
from app.services.data_service import DataService

router = APIRouter(
    prefix="/network",
    tags=["network"],
    responses={404: {"description": "Not found"}},
)

# Network model storage (in-memory for MVP)
# In a real application, this would be stored in a database
NETWORK_MODELS = []
NETWORK_ID_COUNTER = 1

@router.get("/", response_model=List[Dict[str, Any]])
async def get_networks():
    """
    Retrieve all network models.
    """
    return NETWORK_MODELS

@router.get("/{network_id}", response_model=Dict[str, Any])
async def get_network(network_id: int):
    """
    Retrieve a specific network model by ID.
    """
    for network in NETWORK_MODELS:
        if network["id"] == network_id:
            return network
    raise HTTPException(status_code=404, detail="Network not found")

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_network(
    dataset_id: int = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    directed: bool = Form(False),
    weighted: bool = Form(False),
    source_col: Optional[str] = Form(None),
    target_col: Optional[str] = Form(None),
    weight_col: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Create a new network model from a dataset.
    """
    global NETWORK_ID_COUNTER
    
    try:
        # Get the dataset
        dataset = await DataService.get_dataset(db, dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Determine file path to use
        file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
        
        # Create network data dictionary
        network_data = {
            "id": NETWORK_ID_COUNTER,
            "name": name,
            "description": description or f"Network created from dataset: {dataset.name}",
            "dataset_id": dataset_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "directed": directed,
            "weighted": weighted,
            "user_id": user.id,
            "file_path": file_path,
            "attributes": {
                "source_col": source_col,
                "target_col": target_col,
                "weight_col": weight_col,
                "dataset_name": dataset.name
            }
        }
        
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
                import pandas as pd
                df = pd.read_csv(file_path)
            elif file_path.endswith((".xlsx", ".xls")):
                import pandas as pd
                df = pd.read_excel(file_path)
            elif file_path.endswith(".json"):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    import pandas as pd
                    df = pd.DataFrame(data)
                else:
                    raise HTTPException(status_code=400, detail="JSON must contain an array of objects")
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
            
            # Check columns
            if not source_col or not target_col:
                raise HTTPException(status_code=400, detail="Source and target columns must be specified")
            
            if source_col not in df.columns or target_col not in df.columns:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Source or target column not found. Available columns: {', '.join(df.columns)}"
                )
            
            if weighted and weight_col and weight_col not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Weight column not found. Available columns: {', '.join(df.columns)}"
                )
            
            # Create graph
            if directed:
                G = nx.DiGraph()
            else:
                G = nx.Graph()
            
            # Add edges
            for _, row in df.iterrows():
                source = row[source_col]
                target = row[target_col]
                
                # Skip if source or target is missing
                if pd.isna(source) or pd.isna(target):
                    continue
                
                # Add edge
                if weighted and weight_col:
                    weight = row[weight_col] if not pd.isna(row[weight_col]) else 1.0
                    G.add_edge(str(source), str(target), weight=float(weight))
                else:
                    G.add_edge(str(source), str(target))
            
            # Add node attributes from other columns
            node_attributes = {}
            for column in df.columns:
                if column not in [source_col, target_col, weight_col]:
                    # Create a dictionary of node_id -> attribute value
                    node_dict = {}
                    for _, row in df.iterrows():
                        source = row[source_col]
                        if not pd.isna(source) and not pd.isna(row[column]):
                            node_dict[str(source)] = row[column]
                    
                    # Apply attributes to nodes
                    nx.set_node_attributes(G, node_dict, column)
        
        # Calculate basic network metrics
        network_data["node_count"] = G.number_of_nodes()
        network_data["edge_count"] = G.number_of_edges()
        
        # Calculate more detailed metrics
        metrics = NetworkAnalysisService.calculate_network_metrics(G)
        network_data["metrics"] = metrics["global_metrics"]
        
        # Add the network to our storage
        NETWORK_MODELS.append(network_data)
        NETWORK_ID_COUNTER += 1
        
        return network_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating network: {str(e)}")

@router.put("/{network_id}", response_model=Dict[str, Any])
async def update_network(network_id: int, network_update: Dict[str, Any]):
    """
    Update an existing network model metadata.
    """
    for i, network in enumerate(NETWORK_MODELS):
        if network["id"] == network_id:
            # Update network, but don't allow modifying id, created_at
            NETWORK_MODELS[i] = {
                **network,
                **{k: v for k, v in network_update.items() if k not in ["id", "created_at"]},
                "updated_at": datetime.now().isoformat()
            }
            return NETWORK_MODELS[i]
    
    raise HTTPException(status_code=404, detail="Network not found")

@router.delete("/{network_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network(network_id: int):
    """
    Delete a network model.
    """
    for i, network in enumerate(NETWORK_MODELS):
        if network["id"] == network_id:
            NETWORK_MODELS.pop(i)
            return
    
    raise HTTPException(status_code=404, detail="Network not found")

@router.get("/{network_id}/metrics", response_model=Dict[str, Any])
async def get_network_metrics(network_id: int):
    """
    Get metrics for a specific network.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    # Return metrics if already calculated
    if "metrics" in network:
        return {
            "network_id": network_id,
            "global_metrics": network["metrics"],
            "node_metrics": {}  # In a real implementation, we would retrieve node metrics
        }
    
    # Otherwise, calculate metrics now
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
        for i, n in enumerate(NETWORK_MODELS):
            if n["id"] == network_id:
                NETWORK_MODELS[i]["metrics"] = metrics["global_metrics"]
                break
        
        return {
            "network_id": network_id,
            "global_metrics": metrics["global_metrics"],
            "node_metrics": metrics["node_metrics"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating network metrics: {str(e)}")

@router.post("/{network_id}/metrics/calculate", response_model=Dict[str, Any])
async def calculate_network_metrics(network_id: int, metrics: List[str] = []):
    """
    Calculate specified metrics for a network.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
        for i, n in enumerate(NETWORK_MODELS):
            if n["id"] == network_id:
                NETWORK_MODELS[i]["metrics"] = calculated_metrics["global_metrics"]
                break
        
        return {
            "network_id": network_id,
            "global_metrics": calculated_metrics["global_metrics"],
            "node_metrics": calculated_metrics["node_metrics"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating network metrics: {str(e)}")

@router.get("/{network_id}/communities", response_model=Dict[str, Any])
async def get_network_communities(network_id: int):
    """
    Get community detection results for a specific network.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    # Check if communities are already calculated
    if "communities" in network:
        return network["communities"]
    
    # Otherwise, calculate communities now
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
        for i, n in enumerate(NETWORK_MODELS):
            if n["id"] == network_id:
                NETWORK_MODELS[i]["communities"] = communities
                break
        
        return communities
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting communities: {str(e)}")

@router.post("/{network_id}/communities/detect", response_model=Dict[str, Any])
async def detect_communities(network_id: int, algorithm: str = "louvain"):
    """
    Detect communities in a network using the specified algorithm.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
        for i, n in enumerate(NETWORK_MODELS):
            if n["id"] == network_id:
                NETWORK_MODELS[i]["communities"] = communities
                break
        
        return communities
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting communities: {str(e)}")

@router.post("/{network_id}/link-prediction", response_model=List[Dict[str, Any]])
async def predict_links(network_id: int, method: str = "common_neighbors", k: int = 10):
    """
    Predict potential new links in the network.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
async def get_network_data(network_id: int):
    """
    Get the actual network data (nodes and edges) for visualization.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
            node_size_attr="degree" if "degree" in G.nodes(data=True)[0][1] else None
        )
        
        # Add network metadata
        vis_data["network_id"] = network_id
        vis_data["name"] = network["name"]
        vis_data["directed"] = network["directed"]
        vis_data["weighted"] = network["weighted"]
        
        return vis_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing network data: {str(e)}")

@router.post("/{network_id}/export", response_model=Dict[str, Any])
async def export_network(network_id: int, formats: List[str] = ["graphml", "gexf", "json"]):
    """
    Export the network to various file formats.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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
async def calculate_homophily(network_id: int, attribute: str):
    """
    Calculate homophily metrics for a given node attribute.
    """
    # Find the network
    network = None
    for n in NETWORK_MODELS:
        if n["id"] == network_id:
            network = n
            break
    
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    try:
        # Load the network from file
        file_path = network.get("file_path")
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

@router.post("/upload", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def upload_network_file(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    directed: bool = Form(False),
    weighted: bool = Form(False),
    file: UploadFile = File(...),
    user: User = Depends(current_active_user)
):
    """
    Upload a network file (GraphML, GEXF, GML) directly.
    """
    global NETWORK_ID_COUNTER
    
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
        import os
        
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
            
            # Save to a permanent location
            import uuid
            network_id = str(uuid.uuid4())
            os.makedirs("networks", exist_ok=True)
            network_dir = os.path.join("networks", network_id)
            os.makedirs(network_dir, exist_ok=True)
            
            if filename.endswith(".graphml"):
                file_path = os.path.join(network_dir, "network.graphml")
                nx.write_graphml(G, file_path)
            elif filename.endswith(".gexf"):
                file_path = os.path.join(network_dir, "network.gexf")
                nx.write_gexf(G, file_path)
            elif filename.endswith(".gml"):
                file_path = os.path.join(network_dir, "network.gml")
                nx.write_gml(G, file_path)
            
            # Calculate basic network metrics
            metrics = NetworkAnalysisService.calculate_network_metrics(G)
            
            # Create network record
            network_data = {
                "id": NETWORK_ID_COUNTER,
                "name": name,
                "description": description or f"Uploaded network file: {filename}",
                "dataset_id": None,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "directed": G.is_directed(),
                "weighted": weighted,  # This is user-specified
                "user_id": user.id,
                "file_path": file_path,
                "node_count": G.number_of_nodes(),
                "edge_count": G.number_of_edges(),
                "metrics": metrics["global_metrics"],
                "attributes": {
                    "original_filename": filename
                }
            }
            
            # Store network
            NETWORK_MODELS.append(network_data)
            NETWORK_ID_COUNTER += 1
            
            return network_data
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading network file: {str(e)}")