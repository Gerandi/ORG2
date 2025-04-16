from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field


class MLModelBase(BaseModel):
    """Base ML model schema with common attributes."""
    name: str
    algorithm: str
    type: str = Field(..., description="Model type (classification, regression)")
    description: Optional[str] = None
    target_variable: str


class MLModelCreate(MLModelBase):
    """Schema for ML model creation."""
    project_id: Optional[int] = None
    dataset_ids: List[int] = Field(default_factory=list)
    hyperparameters: Optional[Dict[str, Any]] = None


class MLModelUpdate(BaseModel):
    """Schema for ML model updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    dataset_ids: Optional[List[int]] = None
    hyperparameters: Optional[Dict[str, Any]] = None


class MLModelInDB(MLModelBase):
    """ML model schema as stored in database."""
    id: str
    created_at: datetime
    updated_at: datetime
    status: str
    project_id: Optional[int] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, float]] = None
    feature_importances: Optional[Dict[str, float]] = None
    model_file_path: Optional[str] = None
    
    class Config:
        orm_mode = True


class MLModel(MLModelInDB):
    """Full ML model schema for API responses."""
    dataset_ids: List[int] = Field(default_factory=list)


class Feature(BaseModel):
    """Schema for model features."""
    name: str
    importance: float
    category: Optional[str] = None


class FeatureImportance(BaseModel):
    """Schema for feature importance."""
    model_id: str
    features: List[Feature]


class AlgorithmParameter(BaseModel):
    """Schema for algorithm parameters."""
    name: str
    type: str
    default: Any
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[str]] = None
    description: Optional[str] = None


class Algorithm(BaseModel):
    """Schema for ML algorithms."""
    id: str
    name: str
    type: List[str]
    description: str
    parameters: List[AlgorithmParameter]


class ClassificationPrediction(BaseModel):
    """Schema for classification predictions."""
    id: Union[int, str]
    prediction: Union[int, str]
    probability: Optional[float] = None


class RegressionPrediction(BaseModel):
    """Schema for regression predictions."""
    id: Union[int, str]
    prediction: float


class PredictionResult(BaseModel):
    """Schema for prediction results."""
    model_id: str
    predictions: List[Union[ClassificationPrediction, RegressionPrediction]]


class PreparedDataCreate(BaseModel):
    """Schema for prepared data creation."""
    dataset_id: int
    target_column: str
    feature_columns: Optional[List[str]] = None
    network_metrics: Optional[List[str]] = None
    network_id: Optional[int] = None
    test_size: Optional[float] = 0.2


class PreparedData(BaseModel):
    """Schema for prepared data."""
    id: int
    dataset_id: int
    target_column: str
    feature_columns: Optional[List[str]] = None
    network_metrics: Optional[List[str]] = None
    network_id: Optional[int] = None
    test_size: float = 0.2
    created_at: datetime
    file_path: Optional[str] = None
    
    class Config:
        orm_mode = True