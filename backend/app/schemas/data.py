from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class TieStrengthCalculationMethod(str, Enum):
    """Enum for tie strength calculation methods."""
    FREQUENCY = "frequency"
    ATTRIBUTE_VALUE = "attribute_value"

class TieStrengthDefinition(BaseModel):
    """Schema for tie strength definition."""
    source_column: str = Field(..., description="Column representing the source node")
    target_column: str = Field(..., description="Column representing the target node")
    calculation_method: TieStrengthCalculationMethod = Field(..., description="Method to calculate tie strength")
    weight_column: Optional[str] = Field(None, description="Column containing the value for 'attribute_value' method")
    timestamp_column: Optional[str] = Field(None, description="Column containing timestamps for 'frequency' method (optional for simple count)")
    time_window_seconds: Optional[int] = Field(None, description="Time window in seconds for frequency calculation (optional)")
    directed: bool = Field(False, description="Whether the relationship is directed")

class DatasetBase(BaseModel):
    """Base dataset schema with common attributes."""
    name: str
    type: str
    description: Optional[str] = None
    
class DatasetCreate(DatasetBase):
    """Schema for dataset creation."""
    pass

class DatasetUpdate(BaseModel):
    """Schema for dataset updates - all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class DatasetInDB(DatasetBase):
    """Dataset schema as stored in database."""
    id: int
    size: str
    status: str
    created_at: datetime
    updated_at: datetime
    row_count: Optional[int] = None
    columns: Optional[List[str]] = None
    
    class Config:
        orm_mode = True

class Dataset(DatasetInDB):
    """Full dataset schema for API responses."""
    tie_strength_definition: Optional[TieStrengthDefinition] = None

class ProcessingOptions(BaseModel):
    """Schema for dataset processing options."""
    missing_values: Optional[Dict[str, Any]] = Field(
        None,
        description="Options for handling missing values",
        example={
            "strategy": "mean",
            "columns": ["column1", "column2"],
            "fill_value": 0
        }
    )
    data_types: Optional[Dict[str, str]] = Field(
        None,
        description="Column data type conversions",
        example={"column1": "number", "column2": "string"}
    )
    normalization: Optional[Dict[str, Any]] = Field(
        None,
        description="Data normalization options",
        example={
            "strategy": "min_max",
            "columns": ["column1", "column2"]
        }
    )
    transformations: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Custom data transformations",
        example=[
            {
                "operation": "log",
                "columns": ["column1"],
                "parameters": {"base": 10}
            }
        ]
    )

class AnonymizationOptions(BaseModel):
    """Schema for dataset anonymization options."""
    method: str = Field(
        ...,
        description="Anonymization method to use",
        example="pseudonymization"
    )
    sensitive_fields: List[str] = Field(
        ...,
        description="List of fields containing sensitive data",
        example=["name", "email", "ssn"]
    )
    quasi_identifiers: Optional[List[str]] = Field(
        None,
        description="Fields that can be used for re-identification",
        example=["zipcode", "birthdate", "gender"]
    )
    parameters: Optional[Dict[str, Any]] = Field(
        None,
        description="Method-specific parameters",
        example={"k_value": 5, "keep_mapping": True}
    )

class DatasetPreview(BaseModel):
    """Schema for dataset preview."""
    columns: List[str]
    data: List[Dict[str, Any]]
    total_rows: int

class DatasetStats(BaseModel):
    """Schema for dataset statistics."""
    row_count: int
    column_count: int
    missing_values: Dict[str, int]
    data_types: Dict[str, str]
    statistics: Dict[str, Dict[str, Any]]