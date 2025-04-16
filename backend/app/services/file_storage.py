import os
import uuid
import shutil
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
import json
import pandas as pd
import networkx as nx

# Base storage directory
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

# Ensure storage directory exists
os.makedirs(STORAGE_DIR, exist_ok=True)


class FileStorageService:
    """Service for handling file storage operations."""
    
    @staticmethod
    def create_storage_folder(entity_type: str) -> str:
        """
        Create a unique storage folder for a specific entity type.
        
        Args:
            entity_type: Type of entity (datasets, networks, models, simulations)
            
        Returns:
            str: Path to the storage folder
        """
        # Create base folder for entity type if it doesn't exist
        entity_dir = os.path.join(STORAGE_DIR, entity_type)
        os.makedirs(entity_dir, exist_ok=True)
        
        # Create unique folder inside
        folder_id = str(uuid.uuid4())
        folder_path = os.path.join(entity_dir, folder_id)
        os.makedirs(folder_path, exist_ok=True)
        
        return folder_path
    
    @staticmethod
    async def save_uploaded_file(file, entity_type: str, keep_original_name: bool = False) -> Dict[str, str]:
        """
        Save an uploaded file to storage.
        
        Args:
            file: UploadFile from FastAPI
            entity_type: Type of entity (datasets, networks, models, simulations)
            keep_original_name: Whether to keep the original filename
            
        Returns:
            Dict with file paths
        """
        folder_path = FileStorageService.create_storage_folder(entity_type)
        
        # Keep original filename or generate UUID
        if keep_original_name:
            filename = file.filename
        else:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid.uuid4()}{ext}"
        
        file_path = os.path.join(folder_path, filename)
        
        # Save the file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return {
            "folder_path": folder_path,
            "file_path": file_path,
            "filename": filename
        }
    
    @staticmethod
    def save_processed_file(original_file_path: str, processed_data: Any, file_type: str = "csv") -> str:
        """
        Save processed data to a file.
        
        Args:
            original_file_path: Path to the original file
            processed_data: Data to save (DataFrame, dict, etc.)
            file_type: Type of file to save (csv, json, pickle, etc.)
            
        Returns:
            str: Path to the processed file
        """
        folder_path = os.path.dirname(original_file_path)
        
        if file_type == "csv" and isinstance(processed_data, pd.DataFrame):
            processed_file_path = os.path.join(folder_path, "processed_data.csv")
            processed_data.to_csv(processed_file_path, index=False)
        
        elif file_type == "json":
            processed_file_path = os.path.join(folder_path, "processed_data.json")
            
            if isinstance(processed_data, pd.DataFrame):
                processed_data.to_json(processed_file_path, orient="records")
            else:
                with open(processed_file_path, 'w') as f:
                    json.dump(processed_data, f, indent=2)
        
        elif file_type == "xlsx" and isinstance(processed_data, pd.DataFrame):
            processed_file_path = os.path.join(folder_path, "processed_data.xlsx")
            processed_data.to_excel(processed_file_path, index=False)
        
        elif file_type == "graphml" and isinstance(processed_data, nx.Graph):
            processed_file_path = os.path.join(folder_path, "processed_network.graphml")
            nx.write_graphml(processed_data, processed_file_path)
        
        elif file_type == "pickle":
            import pickle
            processed_file_path = os.path.join(folder_path, "processed_data.pkl")
            with open(processed_file_path, 'wb') as f:
                pickle.dump(processed_data, f)
        
        else:
            raise ValueError(f"Unsupported file type: {file_type} or data type: {type(processed_data)}")
        
        return processed_file_path
    
    @staticmethod
    def read_file(file_path: str) -> Any:
        """
        Read a file based on its extension.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Contents of the file
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in ['.csv']:
            return pd.read_csv(file_path)
        
        elif ext in ['.xlsx', '.xls']:
            return pd.read_excel(file_path)
        
        elif ext == '.json':
            with open(file_path, 'r') as f:
                return json.load(f)
        
        elif ext == '.graphml':
            return nx.read_graphml(file_path)
        
        elif ext == '.gexf':
            return nx.read_gexf(file_path)
        
        elif ext == '.gml':
            return nx.read_gml(file_path)
        
        elif ext == '.pkl':
            import pickle
            with open(file_path, 'rb') as f:
                return pickle.load(f)
        
        else:
            # Default: read as text
            with open(file_path, 'r') as f:
                return f.read()
    
    @staticmethod
    def delete_file(file_path: str) -> bool:
        """
        Delete a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False
    
    @staticmethod
    def delete_folder(folder_path: str) -> bool:
        """
        Delete a folder and all its contents.
        
        Args:
            folder_path: Path to the folder
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if os.path.exists(folder_path) and os.path.isdir(folder_path):
                shutil.rmtree(folder_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting folder {folder_path}: {e}")
            return False