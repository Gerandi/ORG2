# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
OrgAI is a novel research platform designed for the analysis, modeling, and simulation of organizational behavior. The platform integrates organizational structure, communication patterns, and performance data within a unified framework, providing academic researchers with tools for computational organizational behavior research.

The platform has four core modules:
1. Data Management - For importing, preprocessing, and managing multi-modal organizational data
2. Social Network Analysis (SNA) - For analyzing and visualizing organizational networks
3. Machine Learning (ML) - For predictive modeling and analysis of organizational phenomena
4. Agent-Based Modeling (ABM) - For simulating organizational dynamics based on empirical data

## Implementation Status

### Backend
- ✅ Core API structure with FastAPI
- ✅ Data Management Service - Implemented real data processing and analysis
- ✅ Network Analysis Service - Implemented real NetworkX-based metrics, community detection, and link prediction
- ✅ Machine Learning Service - Implemented training, validation, and prediction using scikit-learn
- ✅ Agent-Based Modeling Service - Implemented Mesa-based simulations for social influence and diffusion
- ✅ Database models for entities (SQLAlchemy ORM-based)
- ✅ File storage service for datasets, models, and results
- ✅ JWT authentication with refresh token support
- ✅ Password validation with security requirements
- ⏳ Integrate all services with database instead of in-memory storage
- ⏳ Implement token blacklisting for logout security

### Frontend
- ✅ Basic React component structure with TypeScript
- ✅ API service layer for communication with backend
- ✅ Frontend services connected to real backend implementations 
- ✅ Enhanced error handling for API calls with interceptors
- ✅ Data validation and processing for backend compatibility
- ✅ D3.js-based network visualization with interactive features
- ✅ D3.js-based Agent-Based Modeling simulation visualization
- ✅ Context providers for state management (Auth, ABM, Network, ML, Data)
- ✅ Custom hooks implementation for all major features
- ✅ Token refresh logic for authentication
- ✅ Data visualization components for model validation and results
- ⏳ Complete remaining UI components following atomic design 
- ⏳ Add form validation with schema validation
- ⏳ Implement interactive forms for model configuration
- ⏳ Add 3D visualizations for ABM simulations
- ⏳ Add module for Team Assembly and Organizational Learning simulations

## Missing Components and Features

### Backend
- Missing database integration for most endpoints (still using file-based/in-memory storage)
- Token blacklisting mechanism for logout security
- Missing repositories pattern implementation for database access
- Missing unit and integration tests
- Team Assembly and Organizational Learning simulation models not fully implemented
- Error handling middleware not fully implemented
- Database schema migration system not implemented

### Frontend
- Missing atomic components (only Button, Card, Input, Select, Typography implemented)
- Incomplete atomic design implementation (many planned atoms missing)
- Missing MachineLearning page visualizations
- Missing 3D visualizations for ABM simulations
- Missing schema validation for forms
- Missing comprehensive test suite
- Incomplete TypeScript types (some 'any' types still used)

## Next Development Tasks
1. **Backend**:
   - ✅ Implement JWT authentication with refresh token support
   - Update all service layers to use database models instead of file-based storage
   - Create database repositories for all entities
   - Complete Team Assembly and Organizational Learning simulation models
   - Implement JWT token blacklisting for logout
   - Integrate error handling middleware
   - Add unit and integration tests
   - Implement database migrations system

2. **Frontend**:
   - ✅ Implement custom hooks for all major features
   - ✅ Update the Login and Register components to use the new hooks
   - Complete missing atomic components according to the architectural plan
   - Complete additional organism components following atomic design
   - Enhance interactivity for D3.js visualizations with tooltips and animations
   - Add 3D visualizations for ABM simulations
   - Fix TypeScript linting issues and reduce use of 'any' type
   - Implement schema validation (Zod) for form validation
   - Add comprehensive error handling for user feedback
   - Implement additional dashboard views with metrics and visualizations

## Commands
- Frontend:
  - Install dependencies: `cd frontend && npm install`
  - Build: `cd frontend && npm run build`
  - Lint: `cd frontend && npm run lint`
  - Dev server: `cd frontend && npm run dev`
- Backend:
  - Install dependencies: `cd backend && pip install -r requirements.txt`
  - Run server: `cd backend && uvicorn app.main:app --reload`
  - Initialize database: `cd backend && python -m app.core.init_db`
  - Seed database with sample data: `cd backend && python -m app.core.seed_db`
  - Reset database (drops and recreates tables): `cd backend && python -c "from app.core.init_db import init_db; import asyncio; asyncio.run(init_db(reset=True))"`

## Code Style Guidelines
- TypeScript/React (Frontend):
  - Use strict typing with noUnusedLocals, noUnusedParameters
  - React hooks linting enforced
  - ES2020+ features supported
  - Use React functional components with hooks
  - Import order: React, libraries, local components, styles
  - Use TailwindCSS for styling
  - Use atomic design pattern (atoms → molecules → organisms)
  - Implement proper context providers for state management
  - Use custom hooks for reusable logic

- Python (Backend):
  - FastAPI for API endpoints with typed responses
  - Use async/await patterns for API routes
  - Structure endpoints in routers under api/routes
  - Error handling via FastAPI exceptions
  - Follow PEP 8 conventions
  - Use SQLAlchemy for ORM
  - Implement proper dependency injection
  - Document all routes with comprehensive docstrings
  - Use JWT for secure authentication

## Core Libraries
- Frontend:
  - React with TypeScript
  - D3.js for network visualization
  - Axios for API communication
  - TailwindCSS for styling
  - Zod for validation

- Backend:
  - FastAPI for API framework
  - SQLAlchemy for ORM
  - Pandas for data manipulation
  - NetworkX for network analysis
  - Scikit-learn for machine learning
  - Mesa for agent-based modeling
  - PyDantic for data validation
  - JWT for authentication

## Frontend-Backend Integration
- **API Service Layer**:
  - Uses Axios for HTTP communication
  - Implements singleton pattern for service instances
  - Provides comprehensive error handling
  - Includes authentication token management with refresh token support
  
- **Service Implementations**:
  - Data Service: Handles dataset operations, processing, and anonymization
  - Network Service: Manages network creation, metrics, communities, and visualization
  - ML Service: Supports model training, prediction, and evaluation
  - ABM Service: Handles model creation, simulation, and result analysis
  
- **Type Safety**:
  - TypeScript interfaces aligned with backend Pydantic models
  - Proper validation for API requests and responses
  - Type definitions for all service operations

## Implementation Guidelines
1. **Data Management Module:**
   - ✅ Robust file import (CSV, Excel, JSON) with proper validation
   - ✅ Support for data preprocessing (cleaning, normalization)
   - ✅ Anonymization techniques for network data
   - ⏳ Create proper database storage and retrieval mechanisms

2. **Social Network Analysis Module:**
   - ✅ Implemented NetworkX-based calculations for all network metrics
   - ✅ Created visualization components with D3.js
   - ✅ Added support for community detection algorithms (Louvain, Girvan-Newman)
   - ✅ Implemented link prediction functionality
   - ⏳ Enhance visualization with tooltips and animations

3. **Machine Learning Module:**
   - ✅ Integration with SNA to use network metrics as features
   - ✅ Model training with scikit-learn
   - ✅ Cross-validation and evaluation metrics calculation
   - ✅ Model interpretability (feature importance)
   - ⏳ Add SHAP values visualization for model explanation
   - ⏳ Improve UI for model configuration and evaluation

4. **Agent-Based Modeling Module:**
   - ✅ Implemented Mesa-based simulations for Social Influence and Diffusion
   - ✅ Created dynamic visualization of simulation results with D3.js
   - ✅ Implemented interactive network visualizations for agent interactions
   - ✅ Developed simulation validation and results analysis visualization components
   - ✅ Added parameter sensitivity analysis tools
   - ⏳ Complete Team Assembly and Organizational Learning simulation models
   - ⏳ Add 3D visualizations for ABM simulations

5. **Authentication Module:**
   - ✅ JWT-based authentication with refresh tokens
   - ✅ Secure password validation
   - ✅ Token refresh mechanism
   - ✅ Auth context provider with hooks
   - ⏳ Token blacklisting for logout
   - ⏳ Role-based authorization

## Data Flow Integration
- Ensure seamless data flow between modules:
  - ✅ SNA → ML: Network metrics as ML features
  - ✅ SNA → ABM: Network structures defining ABM interaction topologies
  - ✅ Data → All modules: Consistent data access patterns
  - ⏳ ML → ABM: ML insights informing ABM rule parameters