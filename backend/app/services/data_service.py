import os
import json
import csv
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, BinaryIO, Union
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, desc
import networkx as nx
from datetime import datetime
import uuid
import logging

from app.models.dataset import Dataset
from app.services.network_analysis import NetworkAnalysisService
from app.schemas.data import ProcessingOptions, AnonymizationOptions

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create data directory if it doesn't exist
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

class DataService:
    """Service for managing datasets and data processing."""
    
    @staticmethod
    async def get_datasets(db: AsyncSession) -> List[Dataset]:
        """Get all datasets."""
        result = await db.execute(select(Dataset).order_by(desc(Dataset.created_at)))
        return result.scalars().all()
    
    @staticmethod
    async def get_dataset(db: AsyncSession, dataset_id: int) -> Optional[Dataset]:
        """Get dataset by ID."""
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        return result.scalars().first()
    
    @staticmethod
    async def create_dataset(db: AsyncSession, dataset_data: Dict[str, Any]) -> Dataset:
        """Create a new dataset (metadata only)."""
        dataset = Dataset(**dataset_data)
        db.add(dataset)
        await db.commit()
        await db.refresh(dataset)
        return dataset
    
    @staticmethod
    async def update_dataset(db: AsyncSession, dataset_id: int, dataset_data: Dict[str, Any]) -> Optional[Dataset]:
        """Update an existing dataset."""
        await db.execute(
            update(Dataset)
            .where(Dataset.id == dataset_id)
            .values(**dataset_data)
        )
        await db.commit()
        return await DataService.get_dataset(db, dataset_id)
    
    @staticmethod
    async def delete_dataset(db: AsyncSession, dataset_id: int) -> bool:
        """Delete a dataset."""
        # Get the dataset to retrieve file path
        dataset = await DataService.get_dataset(db, dataset_id)
        if dataset and dataset.file_path:
            # Delete the file if it exists
            try:
                if os.path.exists(dataset.file_path):
                    os.remove(dataset.file_path)
            except Exception as e:
                logger.error(f"Error deleting file: {e}")
        
        # Delete from database
        result = await db.execute(delete(Dataset).where(Dataset.id == dataset_id))
        await db.commit()
        return result.rowcount > 0
    
    @staticmethod
    async def upload_dataset(
        db: AsyncSession, 
        file: UploadFile, 
        dataset_name: Optional[str] = None,
        user_id: Optional[int] = None,
        project_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> Dataset:
        """Upload a dataset file and create a dataset record."""
        if not file.filename:
            raise HTTPException(status_code=400, detail="File has no filename")
        
        # Generate unique filename
        file_uuid = str(uuid.uuid4())
        filename_parts = file.filename.split('.')
        extension = filename_parts[-1].lower() if len(filename_parts) > 1 else ""
        
        if not extension:
            raise HTTPException(status_code=400, detail="File has no extension")
        
        # Determine file type
        file_type = "Unknown"
        if extension == "csv":
            file_type = "CSV"
        elif extension in ["xlsx", "xls"]:
            file_type = "XLSX"
        elif extension == "json":
            file_type = "JSON"
        elif extension in ["graphml", "gexf", "gml"]:
            file_type = "NETWORK"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")
        
        # Create directory for this dataset
        dataset_dir = os.path.join(DATA_DIR, file_uuid)
        os.makedirs(dataset_dir, exist_ok=True)
        
        # Define file path
        file_path = os.path.join(dataset_dir, f"data.{extension}")
        
        # Save file
        try:
            contents = await file.read()
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
            file_size = len(contents)
            
            # Process the file to extract metadata
            try:
                column_names, row_count, sample_data = await DataService._extract_file_info(
                    file_path, file_type, 100  # Sample 100 rows
                )
            except Exception as e:
                logger.error(f"Error extracting file info: {e}")
                column_names = []
                row_count = 0
                sample_data = []
            
            # Create dataset record
            name = dataset_name or os.path.basename(file.filename) or "Unnamed dataset"
            dataset_data = {
                "name": name,
                "type": file_type,
                "size": f"{file_size / (1024 * 1024):.2f} MB",
                "description": description or f"Uploaded dataset: {name}",
                "status": "Raw",
                "row_count": row_count,
                "columns": column_names,
                "file_path": file_path,
                "metadata": {
                    "original_filename": file.filename,
                    "upload_timestamp": datetime.now().isoformat(),
                    "sample_data": sample_data[:5] if len(sample_data) > 5 else sample_data  # Store first 5 rows
                }
            }
            
            if user_id:
                dataset_data["user_id"] = user_id
                
            if project_id:
                dataset_data["project_id"] = project_id
            
            return await DataService.create_dataset(db, dataset_data)
            
        except Exception as e:
            # Clean up the directory if there was an error
            try:
                if os.path.exists(dataset_dir):
                    for f in os.listdir(dataset_dir):
                        os.remove(os.path.join(dataset_dir, f))
                    os.rmdir(dataset_dir)
            except:
                pass
            
            raise HTTPException(status_code=500, detail=f"Error uploading dataset: {str(e)}")
    
    @staticmethod
    async def _extract_file_info(file_path: str, file_type: str, sample_rows: int = 100) -> tuple:
        """Extract column names, row count, and sample data from a file."""
        columns = []
        row_count = 0
        sample_data = []
        
        try:
            # CSV handling
            if file_type == "CSV":
                df = pd.read_csv(file_path, nrows=sample_rows)
                columns = df.columns.tolist()
                row_count = len(pd.read_csv(file_path, usecols=[0]))  # Count rows more efficiently
                sample_data = df.to_dict(orient='records')
                
            # XLSX handling
            elif file_type == "XLSX":
                df = pd.read_excel(file_path, nrows=sample_rows)
                columns = df.columns.tolist()
                # For Excel files, we need to read the full file to get row count
                row_count = len(pd.read_excel(file_path, usecols=[0]))
                sample_data = df.to_dict(orient='records')
                
            # JSON handling
            elif file_type == "JSON":
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # If it's an array of objects, get keys from first object
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                    columns = list(data[0].keys())
                    row_count = len(data)
                    sample_data = data[:sample_rows]
                else:
                    columns = list(data.keys())
                    row_count = 1
                    sample_data = [data]
                    
            # Network file handling
            elif file_type == "NETWORK":
                if file_path.endswith(".graphml"):
                    G = nx.read_graphml(file_path)
                elif file_path.endswith(".gexf"):
                    G = nx.read_gexf(file_path)
                elif file_path.endswith(".gml"):
                    G = nx.read_gml(file_path)
                else:
                    raise ValueError(f"Unsupported network file format: {file_path}")
                
                # Extract basic network info
                row_count = G.number_of_nodes()
                
                # Get node attributes (from first node if available)
                if G.number_of_nodes() > 0:
                    first_node = list(G.nodes())[0]
                    node_attrs = G.nodes[first_node]
                    columns = ["id"] + list(node_attrs.keys())
                else:
                    columns = ["id"]
                
                # Sample node data
                sample_data = []
                for i, node in enumerate(G.nodes(data=True)):
                    if i >= sample_rows:
                        break
                    node_id, attrs = node
                    node_data = {"id": node_id}
                    node_data.update(attrs)
                    sample_data.append(node_data)
            
            return columns, row_count, sample_data
            
        except Exception as e:
            logger.error(f"Error extracting file info: {e}")
            # In case of error, return empty information
            return [], 0, []
    
    @staticmethod
    async def process_dataset(
        db: AsyncSession, 
        dataset_id: int, 
        options: ProcessingOptions
    ) -> Dataset:
        """Process a dataset (clean, transform, normalize)."""
        dataset = await DataService.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(status_code=400, detail="Dataset file not found")
        
        try:
            # Load the dataset
            file_type = dataset.type
            file_path = dataset.file_path
            
            if file_type == "CSV":
                df = pd.read_csv(file_path)
            elif file_type == "XLSX":
                df = pd.read_excel(file_path)
            elif file_type == "JSON":
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                else:
                    # Convert single object to dataframe
                    df = pd.DataFrame([data])
            elif file_type == "NETWORK":
                # For network files, we need special handling
                return await DataService._process_network_dataset(db, dataset, options)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type for processing: {file_type}")
            
            # Apply processing operations
            if options.handle_missing_values:
                if options.missing_value_strategy == "drop_rows":
                    df = df.dropna()
                elif options.missing_value_strategy == "drop_columns":
                    df = df.dropna(axis=1)
                elif options.missing_value_strategy == "fill_mean":
                    numeric_cols = df.select_dtypes(include=[np.number]).columns
                    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
                elif options.missing_value_strategy == "fill_median":
                    numeric_cols = df.select_dtypes(include=[np.number]).columns
                    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
                elif options.missing_value_strategy == "fill_mode":
                    for col in df.columns:
                        df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else None)
                elif options.missing_value_strategy == "fill_constant":
                    df = df.fillna(options.fill_value or 0)
            
            if options.normalize_columns and options.columns_to_normalize:
                for col in options.columns_to_normalize:
                    if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                        if options.normalization_method == "min_max":
                            df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
                        elif options.normalization_method == "z_score":
                            df[col] = (df[col] - df[col].mean()) / df[col].std()
            
            if options.remove_duplicates:
                df = df.drop_duplicates()
            
            if options.filter_rows and options.filter_condition:
                # Simple filtering with eval (be cautious with this in production)
                try:
                    df = df.query(options.filter_condition)
                except:
                    pass
            
            # Save processed dataset
            dataset_dir = os.path.dirname(file_path)
            processed_file_path = os.path.join(dataset_dir, "processed_data.csv")
            df.to_csv(processed_file_path, index=False)
            
            # Update dataset record
            processing_details = options.dict()
            processing_details["timestamp"] = datetime.now().isoformat()
            
            update_data = {
                "status": "Processed",
                "row_count": len(df),
                "columns": df.columns.tolist(),
                "processed_file_path": processed_file_path,
                "metadata": {
                    **(dataset.metadata or {}),
                    "processing": processing_details
                }
            }
            
            return await DataService.update_dataset(db, dataset_id, update_data)
            
        except Exception as e:
            logger.error(f"Error processing dataset: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing dataset: {str(e)}")
    
    @staticmethod
    async def _process_network_dataset(
        db: AsyncSession, 
        dataset: Dataset, 
        options: ProcessingOptions
    ) -> Dataset:
        """Process a network dataset."""
        try:
            file_path = dataset.file_path
            
            # Load the network
            if file_path.endswith(".graphml"):
                G = nx.read_graphml(file_path)
            elif file_path.endswith(".gexf"):
                G = nx.read_gexf(file_path)
            elif file_path.endswith(".gml"):
                G = nx.read_gml(file_path)
            else:
                raise ValueError(f"Unsupported network file format: {file_path}")
            
            # Apply specific network processing
            if options.remove_isolates:
                isolates = list(nx.isolates(G))
                G.remove_nodes_from(isolates)
            
            if options.largest_component_only:
                if G.is_directed():
                    largest_cc = max(nx.weakly_connected_components(G), key=len)
                else:
                    largest_cc = max(nx.connected_components(G), key=len)
                G = G.subgraph(largest_cc).copy()
            
            # Save processed network
            dataset_dir = os.path.dirname(file_path)
            processed_file_path = os.path.join(dataset_dir, "processed_network.graphml")
            nx.write_graphml(G, processed_file_path)
            
            # Calculate basic network metrics
            metrics = NetworkAnalysisService.calculate_network_metrics(G)
            
            # Update dataset record
            processing_details = options.dict()
            processing_details["timestamp"] = datetime.now().isoformat()
            
            update_data = {
                "status": "Processed",
                "row_count": G.number_of_nodes(),
                "columns": ["id"] + list(G.nodes[list(G.nodes())[0]].keys()) if G.number_of_nodes() > 0 else ["id"],
                "processed_file_path": processed_file_path,
                "metadata": {
                    **(dataset.metadata or {}),
                    "processing": processing_details,
                    "network_metrics": {
                        "node_count": G.number_of_nodes(),
                        "edge_count": G.number_of_edges(),
                        "density": metrics["global_metrics"].get("density", 0),
                        "average_clustering": metrics["global_metrics"].get("average_clustering", 0)
                    }
                }
            }
            
            return await DataService.update_dataset(db, dataset_id, update_data)
            
        except Exception as e:
            logger.error(f"Error processing network dataset: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing network dataset: {str(e)}")
    
    @staticmethod
    async def anonymize_dataset(
        db: AsyncSession, 
        dataset_id: int, 
        options: AnonymizationOptions
    ) -> Dataset:
        """Apply anonymization to a dataset."""
        dataset = await DataService.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Determine which file to use (processed or original)
        file_path = dataset.processed_file_path if dataset.processed_file_path else dataset.file_path
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Dataset file not found")
        
        try:
            # Load the dataset
            file_type = dataset.type
            
            if file_type == "CSV" or (file_type == "NETWORK" and file_path.endswith(".csv")):
                df = pd.read_csv(file_path)
            elif file_type == "XLSX":
                df = pd.read_excel(file_path)
            elif file_type == "JSON":
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                else:
                    df = pd.DataFrame([data])
            elif file_type == "NETWORK":
                # For network files, handle differently
                return await DataService._anonymize_network_dataset(db, dataset, options)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type for anonymization: {file_type}")
            
            # Apply anonymization based on method
            if options.method == "pseudonymization":
                for col in options.columns:
                    if col in df.columns:
                        # Create a mapping of original values to pseudonyms
                        unique_values = df[col].unique()
                        pseudonyms = {val: f"{col}_{i}" for i, val in enumerate(unique_values)}
                        
                        # Replace values with pseudonyms
                        df[col] = df[col].map(pseudonyms)
            
            elif options.method == "generalization":
                for col, level in zip(options.columns, options.generalization_levels or []):
                    if col in df.columns:
                        if pd.api.types.is_numeric_dtype(df[col]):
                            # For numeric columns, bin the data
                            level = level or 5  # Default to 5 bins if not specified
                            df[col] = pd.cut(df[col], bins=level, labels=False)
                        elif pd.api.types.is_datetime64_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
                            # For date columns, truncate to year, month, etc.
                            level = level or "month"  # Default to month
                            if level == "year":
                                df[col] = pd.to_datetime(df[col]).dt.year
                            elif level == "month":
                                df[col] = pd.to_datetime(df[col]).dt.strftime("%Y-%m")
                            elif level == "day":
                                df[col] = pd.to_datetime(df[col]).dt.strftime("%Y-%m-%d")
                        else:
                            # For categorical/string columns, take first n characters
                            n = level or 1
                            df[col] = df[col].astype(str).str[:n]
            
            elif options.method == "masking":
                for col in options.columns:
                    if col in df.columns:
                        # Replace with mask character
                        mask_char = options.mask_character or "*"
                        df[col] = mask_char * 5  # Simple masking
            
            elif options.method == "suppression":
                # Drop the specified columns
                df = df.drop(columns=[col for col in options.columns if col in df.columns])
            
            # Save anonymized dataset
            dataset_dir = os.path.dirname(file_path)
            anonymized_file_path = os.path.join(dataset_dir, "anonymized_data.csv")
            df.to_csv(anonymized_file_path, index=False)
            
            # Update dataset record
            anonymization_details = options.dict()
            anonymization_details["timestamp"] = datetime.now().isoformat()
            
            update_data = {
                "status": "Anonymized",
                "anonymized_file_path": anonymized_file_path,
                "columns": df.columns.tolist(),
                "metadata": {
                    **(dataset.metadata or {}),
                    "anonymization": anonymization_details
                }
            }
            
            return await DataService.update_dataset(db, dataset_id, update_data)
            
        except Exception as e:
            logger.error(f"Error anonymizing dataset: {e}")
            raise HTTPException(status_code=500, detail=f"Error anonymizing dataset: {str(e)}")
    
    @staticmethod
    async def _anonymize_network_dataset(
        db: AsyncSession, 
        dataset: Dataset, 
        options: AnonymizationOptions
    ) -> Dataset:
        """Anonymize a network dataset."""
        try:
            file_path = dataset.processed_file_path if dataset.processed_file_path else dataset.file_path
            
            # Load the network
            if file_path.endswith(".graphml"):
                G = nx.read_graphml(file_path)
            elif file_path.endswith(".gexf"):
                G = nx.read_gexf(file_path)
            elif file_path.endswith(".gml"):
                G = nx.read_gml(file_path)
            else:
                raise ValueError(f"Unsupported network file format: {file_path}")
            
            # Apply anonymization to node attributes
            if options.method == "pseudonymization":
                # Create mapping of node IDs to anonymous IDs
                node_mapping = {node: f"node_{i}" for i, node in enumerate(G.nodes())}
                
                # Create a new graph with anonymized nodes
                G_anon = nx.Graph() if not G.is_directed() else nx.DiGraph()
                
                # Add nodes with anonymized attributes
                for node, attrs in G.nodes(data=True):
                    new_attrs = {}
                    for key, value in attrs.items():
                        if key in options.columns:
                            # Anonymize this attribute
                            if isinstance(value, str):
                                new_attrs[key] = f"{key}_{hash(value) % 1000}"
                            else:
                                new_attrs[key] = f"{key}_{value}"
                        else:
                            new_attrs[key] = value
                    
                    G_anon.add_node(node_mapping[node], **new_attrs)
                
                # Add edges with original attributes
                for u, v, data in G.edges(data=True):
                    G_anon.add_edge(node_mapping[u], node_mapping[v], **data)
                
                # Save anonymized network
                dataset_dir = os.path.dirname(file_path)
                anonymized_file_path = os.path.join(dataset_dir, "anonymized_network.graphml")
                nx.write_graphml(G_anon, anonymized_file_path)
                
            elif options.method == "suppression":
                # Create a new graph without the specified attributes
                G_anon = nx.Graph() if not G.is_directed() else nx.DiGraph()
                
                # Add nodes without the suppressed attributes
                for node, attrs in G.nodes(data=True):
                    new_attrs = {k: v for k, v in attrs.items() if k not in options.columns}
                    G_anon.add_node(node, **new_attrs)
                
                # Add edges with original attributes
                for u, v, data in G.edges(data=True):
                    G_anon.add_edge(u, v, **data)
                
                # Save anonymized network
                dataset_dir = os.path.dirname(file_path)
                anonymized_file_path = os.path.join(dataset_dir, "anonymized_network.graphml")
                nx.write_graphml(G_anon, anonymized_file_path)
            
            else:
                # For other methods, apply similar logic as above but with appropriate anonymization
                # For simplicity, default to pseudonymization
                anonymized_file_path = file_path  # No change if method not implemented
            
            # Update dataset record
            anonymization_details = options.dict()
            anonymization_details["timestamp"] = datetime.now().isoformat()
            
            update_data = {
                "status": "Anonymized",
                "anonymized_file_path": anonymized_file_path,
                "metadata": {
                    **(dataset.metadata or {}),
                    "anonymization": anonymization_details
                }
            }
            
            return await DataService.update_dataset(db, dataset_id, update_data)
            
        except Exception as e:
            logger.error(f"Error anonymizing network dataset: {e}")
            raise HTTPException(status_code=500, detail=f"Error anonymizing network dataset: {str(e)}")
    
    @staticmethod
    async def get_dataset_preview(
        db: AsyncSession, 
        dataset_id: int, 
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get a preview of the dataset's contents."""
        dataset = await DataService.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Determine which file to use (anonymized, processed, or original)
        file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Dataset file not found")
        
        try:
            # Load the data based on file type
            file_type = dataset.type
            
            if file_type == "CSV" or file_path.endswith(".csv"):
                df = pd.read_csv(file_path, nrows=limit)
                columns = df.columns.tolist()
                data = df.to_dict(orient='records')
                
            elif file_type == "XLSX" or file_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_path, nrows=limit)
                columns = df.columns.tolist()
                data = df.to_dict(orient='records')
                
            elif file_type == "JSON" or file_path.endswith(".json"):
                with open(file_path, 'r') as f:
                    json_data = json.load(f)
                
                if isinstance(json_data, list):
                    data = json_data[:limit]
                    columns = list(data[0].keys()) if data else []
                else:
                    data = [json_data]
                    columns = list(json_data.keys())
                    
            elif file_type == "NETWORK" or file_path.endswith((".graphml", ".gexf", ".gml")):
                # For network files, convert to a node-attribute dataframe for preview
                if file_path.endswith(".graphml"):
                    G = nx.read_graphml(file_path)
                elif file_path.endswith(".gexf"):
                    G = nx.read_gexf(file_path)
                elif file_path.endswith(".gml"):
                    G = nx.read_gml(file_path)
                else:
                    raise ValueError(f"Unsupported network file format: {file_path}")
                
                # Get node data
                data = []
                for i, (node, attrs) in enumerate(G.nodes(data=True)):
                    if i >= limit:
                        break
                    node_data = {"id": node}
                    node_data.update(attrs)
                    data.append(node_data)
                
                columns = ["id"] + list(data[0].keys() - {"id"}) if data else ["id"]
                
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type for preview: {file_type}")
            
            return {
                "columns": columns,
                "data": data,
                "total_rows": dataset.row_count or 0
            }
            
        except Exception as e:
            logger.error(f"Error getting dataset preview: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting dataset preview: {str(e)}")
    
    @staticmethod
    async def get_dataset_stats(db: AsyncSession, dataset_id: int) -> Dict[str, Any]:
        """Get statistics about the dataset."""
        dataset = await DataService.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Determine which file to use
        file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Dataset file not found")
        
        try:
            # Load the data based on file type
            file_type = dataset.type
            
            if file_type == "CSV" or file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
                stats = DataService._calculate_dataframe_stats(df)
                
            elif file_type == "XLSX" or file_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_path)
                stats = DataService._calculate_dataframe_stats(df)
                
            elif file_type == "JSON" or file_path.endswith(".json"):
                with open(file_path, 'r') as f:
                    json_data = json.load(f)
                
                if isinstance(json_data, list):
                    df = pd.DataFrame(json_data)
                    stats = DataService._calculate_dataframe_stats(df)
                else:
                    # Single object
                    df = pd.DataFrame([json_data])
                    stats = DataService._calculate_dataframe_stats(df)
                    
            elif file_type == "NETWORK" or file_path.endswith((".graphml", ".gexf", ".gml")):
                # For network files, calculate network statistics
                if file_path.endswith(".graphml"):
                    G = nx.read_graphml(file_path)
                elif file_path.endswith(".gexf"):
                    G = nx.read_gexf(file_path)
                elif file_path.endswith(".gml"):
                    G = nx.read_gml(file_path)
                else:
                    raise ValueError(f"Unsupported network file format: {file_path}")
                
                # Calculate network metrics
                metrics = NetworkAnalysisService.calculate_network_metrics(G)
                
                # Get node attribute statistics if available
                node_attrs = {}
                
                if G.number_of_nodes() > 0:
                    # Extract all node attributes
                    all_attrs = {}
                    for node, attrs in G.nodes(data=True):
                        for key, value in attrs.items():
                            if key not in all_attrs:
                                all_attrs[key] = []
                            all_attrs[key].append(value)
                    
                    # Calculate statistics for each attribute
                    for key, values in all_attrs.items():
                        # Convert to pandas Series for easier stats calculation
                        s = pd.Series(values)
                        
                        # Basic stats that work for any data type
                        attr_stats = {
                            "unique_values": s.nunique(),
                            "most_common": s.value_counts().index[0] if not s.value_counts().empty else None,
                            "most_common_count": s.value_counts().iloc[0] if not s.value_counts().empty else 0,
                            "missing_values": s.isna().sum()
                        }
                        
                        # Additional stats for numeric data
                        if pd.api.types.is_numeric_dtype(s):
                            attr_stats.update({
                                "min": float(s.min()),
                                "max": float(s.max()),
                                "mean": float(s.mean()),
                                "median": float(s.median()),
                                "std": float(s.std())
                            })
                        
                        node_attrs[key] = attr_stats
                
                stats = {
                    "network_metrics": metrics["global_metrics"],
                    "node_attributes": node_attrs,
                    "row_count": G.number_of_nodes(),
                    "edge_count": G.number_of_edges(),
                    "directed": G.is_directed(),
                    "node_degree_distribution": {
                        "min": min(dict(G.degree()).values()) if G.number_of_nodes() > 0 else 0,
                        "max": max(dict(G.degree()).values()) if G.number_of_nodes() > 0 else 0,
                        "mean": sum(dict(G.degree()).values()) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0
                    }
                }
                
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type for statistics: {file_type}")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting dataset statistics: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting dataset statistics: {str(e)}")
    
    @staticmethod
    def _calculate_dataframe_stats(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate comprehensive statistics for a dataframe."""
        stats = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "missing_values": {col: int(df[col].isna().sum()) for col in df.columns},
            "data_types": {col: str(df[col].dtype) for col in df.columns},
            "statistics": {}
        }
        
        for col in df.columns:
            col_stats = {}
            
            # Basic stats for all columns
            col_stats["unique_values"] = df[col].nunique()
            col_stats["missing_percentage"] = float(df[col].isna().mean() * 100)
            
            try:
                # Get most common value if not all values are unique
                if col_stats["unique_values"] < len(df):
                    value_counts = df[col].value_counts()
                    if not value_counts.empty:
                        col_stats["most_common"] = str(value_counts.index[0])
                        col_stats["most_common_count"] = int(value_counts.iloc[0])
                        col_stats["most_common_percentage"] = float(value_counts.iloc[0] / len(df) * 100)
            except:
                pass
            
            # Stats for numeric columns
            if pd.api.types.is_numeric_dtype(df[col]):
                try:
                    col_stats["min"] = float(df[col].min())
                    col_stats["max"] = float(df[col].max())
                    col_stats["mean"] = float(df[col].mean())
                    col_stats["median"] = float(df[col].median())
                    col_stats["std"] = float(df[col].std())
                    
                    # Calculate quartiles
                    col_stats["q1"] = float(df[col].quantile(0.25))
                    col_stats["q3"] = float(df[col].quantile(0.75))
                    col_stats["iqr"] = float(col_stats["q3"] - col_stats["q1"])
                    
                    # Check for outliers using IQR method
                    lower_bound = col_stats["q1"] - 1.5 * col_stats["iqr"]
                    upper_bound = col_stats["q3"] + 1.5 * col_stats["iqr"]
                    outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col]
                    col_stats["outlier_count"] = len(outliers)
                    col_stats["outlier_percentage"] = float(len(outliers) / len(df) * 100)
                except:
                    pass
            
            # Stats for datetime columns
            elif pd.api.types.is_datetime64_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
                try:
                    col_stats["min"] = df[col].min().isoformat()
                    col_stats["max"] = df[col].max().isoformat()
                    col_stats["range_days"] = (df[col].max() - df[col].min()).days
                except:
                    pass
            
            # Stats for string/object columns
            elif pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]):
                try:
                    # Length statistics
                    df[col] = df[col].astype(str)
                    length_series = df[col].str.len()
                    col_stats["min_length"] = int(length_series.min())
                    col_stats["max_length"] = int(length_series.max())
                    col_stats["mean_length"] = float(length_series.mean())
                    
                    # Check if it could be categorical
                    if col_stats["unique_values"] < 0.2 * len(df):  # If less than 20% unique values
                        col_stats["categorical_candidates"] = True
                        
                        # Get top 5 categories
                        top_categories = df[col].value_counts().head(5).to_dict()
                        col_stats["top_categories"] = {str(k): int(v) for k, v in top_categories.items()}
                except:
                    pass
            
            stats["statistics"][col] = col_stats
        
        return stats