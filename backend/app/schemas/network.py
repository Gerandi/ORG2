from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Node(BaseModel):
    """Schema for network nodes."""
    id: str
    label: str
    attributes: Dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    """Schema for network edges."""
    source: str
    target: str
    weight: Optional[float] = None
    attributes: Optional[Dict[str, Any]] = None


class NetworkBase(BaseModel):
    """Base network schema with common attributes."""
    name: str
    directed: bool = False
    weighted: bool = False
    description: Optional[str] = None


class NetworkCreate(NetworkBase):
    """Schema for network creation."""
    dataset_id: Optional[int] = None
    project_id: Optional[int] = None
    source_col: Optional[str] = None
    target_col: Optional[str] = None
    weight_col: Optional[str] = None


class NetworkUpdate(BaseModel):
    """Schema for network updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    directed: Optional[bool] = None
    weighted: Optional[bool] = None
    attributes: Optional[Dict[str, Any]] = None


class NetworkInDB(NetworkBase):
    """Network schema as stored in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    node_count: Optional[int] = None
    edge_count: Optional[int] = None
    dataset_id: Optional[int] = None
    project_id: Optional[int] = None
    file_path: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True


class Network(NetworkInDB):
    """Full network schema for API responses."""
    pass


class NetworkData(BaseModel):
    """Schema for network visualization data."""
    network_id: int
    name: str
    nodes: List[Node]
    edges: List[Edge]
    directed: bool
    weighted: bool


class NetworkMetricsGlobal(BaseModel):
    """Schema for global network metrics."""
    density: float
    average_path_length: Optional[float] = None
    diameter: Optional[float] = None
    clustering: float
    modularity: Optional[float] = None


class NodeMetrics(BaseModel):
    """Schema for node-level metrics."""
    degree: float
    betweenness: Optional[float] = None
    closeness: Optional[float] = None
    eigenvector: Optional[float] = None
    clustering: Optional[float] = None


class NetworkMetrics(BaseModel):
    """Schema for network metrics."""
    network_id: int
    global_metrics: NetworkMetricsGlobal
    node_metrics: Dict[str, NodeMetrics]


class Community(BaseModel):
    """Schema for network communities."""
    size: int
    density: float
    cohesion: float
    nodes: List[str]


class Communities(BaseModel):
    """Schema for community detection results."""
    network_id: int
    algorithm: str
    num_communities: int
    modularity: float
    communities: Dict[str, Community]


class LayoutOptions(BaseModel):
    """Schema for network layout options."""
    type: str
    parameters: Optional[Dict[str, Any]] = None


class VisualizationOptions(BaseModel):
    """Schema for network visualization options."""
    layout: LayoutOptions
    node_size: Dict[str, Any]
    node_color: Dict[str, Any]
    edge_width: Dict[str, Any]
    show_labels: bool
    label_property: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None