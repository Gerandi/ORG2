from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends, Query
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.services.data_service import DataService
from app.auth.authentication import current_active_user
from app.models.user import User
from app.schemas.data import (
    Dataset, DatasetCreate, DatasetUpdate,
    ProcessingOptions, AnonymizationOptions,
    DatasetPreview, DatasetStats
)

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Dataset])
async def get_datasets(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all datasets.
    """
    return await DataService.get_datasets(db)

@router.get("/{dataset_id}", response_model=Dataset)
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

@router.post("/", response_model=Dataset, status_code=status.HTTP_201_CREATED)
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

@router.post("/upload", response_model=Dataset, status_code=status.HTTP_201_CREATED)
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

@router.put("/{dataset_id}", response_model=Dataset)
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

@router.post("/{dataset_id}/process", response_model=Dataset)
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

@router.post("/{dataset_id}/anonymize", response_model=Dataset)
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