from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends, Query, Response
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
import os
import pandas as pd
import json

from app.core.database import get_async_session
from app.services.data_service import DataService
from app.auth.authentication import current_active_user
from app.models.user import User
from app.models.models import Dataset
from app.schemas.data import (
    Dataset as DatasetSchema, DatasetCreate, DatasetUpdate,
    ProcessingOptions, AnonymizationOptions,
    DatasetPreview, DatasetStats,
    TieStrengthDefinition, TieStrengthCalculationMethod
)

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[DatasetSchema])
async def get_datasets(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all datasets.
    """
    # Implement authorization filter
    if user.is_superuser:
        query = select(Dataset)
    else:
        query = select(Dataset).where(Dataset.user_id == user.id)
    
    # Add project filter if provided
    if project_id is not None:
        query = query.where(Dataset.project_id == project_id)
    
    result = await db.execute(query)
    datasets = result.scalars().all()
    
    return datasets

@router.get("/{dataset_id}", response_model=DatasetSchema)
async def get_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific dataset by ID.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.post("/", response_model=DatasetSchema, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    dataset: DatasetCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Add a new dataset (metadata only).
    """
    dataset_data = dataset.dict()
    dataset_data["user_id"] = user.id
    
    return await DataService.create_dataset(db, dataset_data)

@router.post("/upload", response_model=DatasetSchema, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form(None),
    project_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Upload a dataset file.
    """
    return await DataService.upload_dataset(
        db, 
        file, 
        dataset_name=dataset_name,
        user_id=user.id,
        project_id=project_id
    )

@router.put("/{dataset_id}", response_model=DatasetSchema)
async def update_dataset(
    dataset_id: int,
    dataset_update: DatasetUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Update an existing dataset metadata.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check ownership (in a real app, you might want more complex permission checking)
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to update this dataset")
    
    return await DataService.update_dataset(db, dataset_id, dataset_update.dict(exclude_unset=True))

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Delete a dataset.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check ownership
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dataset")
    
    success = await DataService.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete dataset")

@router.post("/{dataset_id}/process", response_model=DatasetSchema)
async def process_dataset(
    dataset_id: int,
    processing_options: ProcessingOptions,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Process a dataset (cleaning, normalization, etc.).
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check ownership
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to process this dataset")
    
    return await DataService.process_dataset(db, dataset_id, processing_options)

@router.post("/{dataset_id}/anonymize", response_model=DatasetSchema)
async def anonymize_dataset(
    dataset_id: int,
    anonymization_options: AnonymizationOptions,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Apply anonymization to a dataset.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check ownership
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to anonymize this dataset")
    
    return await DataService.anonymize_dataset(db, dataset_id, anonymization_options)

@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
async def get_dataset_preview(
    dataset_id: int,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get a preview of the dataset's contents.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access permission
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset")
    
    return await DataService.get_dataset_preview(db, dataset_id, limit)

@router.get("/{dataset_id}/stats", response_model=DatasetStats)
async def get_dataset_stats(
    dataset_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get statistics about the dataset.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access permission
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset")
    
    return await DataService.get_dataset_stats(db, dataset_id)

@router.post("/{dataset_id}/tie-strength", response_model=DatasetSchema)
async def define_tie_strength(
    dataset_id: int,
    definition: TieStrengthDefinition,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """Define how tie strength should be calculated for this dataset."""
    # Fetch the dataset
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    # Authorization check
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Validate columns exist in dataset.columns (if dataset.columns is populated)
    required_cols = [definition.source_column, definition.target_column]
    if definition.calculation_method == TieStrengthCalculationMethod.ATTRIBUTE_VALUE and definition.weight_column:
        required_cols.append(definition.weight_column)
    if definition.timestamp_column:
        required_cols.append(definition.timestamp_column)

    if dataset.columns: # Only validate if columns are known
        missing_cols = [col for col in required_cols if col not in dataset.columns]
        if missing_cols:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Columns not found in dataset: {', '.join(missing_cols)}"
            )

    # Update the dataset record
    stmt = (
        update(Dataset)
        .where(Dataset.id == dataset_id)
        .values(tie_strength_definition=definition.dict())
    )
    await db.execute(stmt)
    await db.commit()
    await db.refresh(dataset)

    return dataset

@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: int,
    format: str = Query('csv', enum=['csv', 'xlsx', 'json']),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Download a dataset in the specified format.
    """
    dataset = await DataService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check access permission
    if dataset.user_id != user.id and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset")
    
    # Determine which file to use (anonymized, processed, or original)
    file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Dataset file not found")
    
    try:
        # Read file into pandas DataFrame
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif file_path.endswith('.json'):
            with open(file_path, 'r') as f:
                data = json.load(f)
            if isinstance(data, list):
                df = pd.DataFrame(data)
            else:
                df = pd.DataFrame([data])
        else:
            # For other formats, try csv first
            try:
                df = pd.read_csv(file_path)
            except:
                raise HTTPException(status_code=400, detail="Unsupported file format for download")
        
        # Prepare the file in the requested format
        if format == 'csv':
            output = df.to_csv(index=False)
            media_type = "text/csv"
            filename = f"{dataset.name.replace(' ', '_')}.csv"
        elif format == 'xlsx':
            from io import BytesIO
            output_buffer = BytesIO()
            df.to_excel(output_buffer, index=False)
            output = output_buffer.getvalue()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{dataset.name.replace(' ', '_')}.xlsx"
        elif format == 'json':
            output = df.to_json(orient='records')
            media_type = "application/json"
            filename = f"{dataset.name.replace(' ', '_')}.json"
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        # Set appropriate headers
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
        
        if format == 'xlsx':
            # Return binary response for Excel
            return Response(
                content=output,
                media_type=media_type,
                headers=headers
            )
        else:
            # Return text response for CSV and JSON
            return Response(
                content=output,
                media_type=media_type,
                headers=headers
            )
            
    except Exception as e:
        logger.error(f"Error downloading dataset: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading dataset: {str(e)}")