# Database Implementation

This document provides information about the database implementation for the OrgAI backend.

## Overview

The OrgAI application uses SQLAlchemy as an Object-Relational Mapping (ORM) tool to interact with SQLite database (easily replaceable with PostgreSQL or other databases in production).

## Database Models

The following tables are defined in the database:

1. **users**: Stores user information including authentication details
2. **projects**: Organizes research activities into logical groups
3. **datasets**: Stores metadata about imported data files
4. **networks**: Contains network models created from datasets
5. **abm_models**: Stores agent-based models for simulation
6. **abm_simulations**: Contains individual simulation runs for ABM models
7. **ml_models**: Stores machine learning models with hyperparameters
8. **prepared_data**: Contains prepared datasets for ML training

## Association Tables

- **user_project**: Many-to-many relationship between users and projects
- **dataset_mlmodel**: Many-to-many relationship between datasets and ML models

## File Storage

In addition to the database, the application stores files on the filesystem:

- **datasets**: Original and processed data files
- **networks**: Network exports in various formats
- **ml_models**: Serialized ML models
- **abm_simulations**: Simulation results

The file paths are stored in the database for reference.

## Setup and Maintenance

### Initial Setup

To set up the database for the first time:

```bash
cd backend
python -m app.core.init_db
```

### Seeding with Sample Data

To populate the database with sample data:

```bash
cd backend
python -m app.core.seed_db
```

### Reset Database

To completely reset the database (drop all tables and recreate):

```bash
cd backend
python -c "from app.core.init_db import init_db; import asyncio; asyncio.run(init_db(reset=True))"
```

## Development Guidelines

1. **Always use async/await patterns** when accessing the database
2. **Use transactions** for operations that involve multiple updates
3. **Define proper relationships** between entities
4. **Use JSON columns** for flexible schema parts (attributes, parameters, etc.)
5. **Create proper indexes** for frequently queried columns
6. **Implement proper entity lifecycle management** including cascading deletes

## Entity Relationships

- User → Projects: One-to-Many
- Project → Datasets: One-to-Many
- Dataset → Networks: One-to-Many
- Project → Networks: One-to-Many
- Network → ABM Models: One-to-Many
- ABM Model → Simulations: One-to-Many
- Project → ML Models: One-to-Many
- Dataset → ML Models: Many-to-Many
- Dataset → Prepared Data: One-to-Many