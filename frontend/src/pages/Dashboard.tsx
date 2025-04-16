import React from 'react';
import { FileText, Database, Network, Users } from 'lucide-react';
import MetricCard from '../components/molecules/MetricCard';
import Card from '../components/atoms/Card';
import { Heading, Text } from '../components/atoms/Typography';

const Dashboard: React.FC = () => {
  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Projects"
          value={6}
          icon={<FileText size={20} />}
          iconColor="bg-blue-100 text-blue-600"
        />
        
        <MetricCard
          title="Datasets"
          value={12}
          icon={<Database size={20} />}
          iconColor="bg-green-100 text-green-600"
          trend={{ value: 20, isPositive: true }}
        />
        
        <MetricCard
          title="Network Models"
          value={8}
          icon={<Network size={20} />}
          iconColor="bg-purple-100 text-purple-600"
        />
        
        <MetricCard
          title="Simulations"
          value={4}
          icon={<Users size={20} />}
          iconColor="bg-orange-100 text-orange-600"
          trend={{ value: 33, isPositive: true }}
        />
      </div>
      
      {/* Recent Projects & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Heading level={3}>Recent Projects</Heading>
            <button className="text-sm text-blue-600 flex items-center">
              View All 
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="ml-1"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              {id: 1, name: 'Communication Patterns Study', date: '2025-04-14', type: 'SNA'},
              {id: 2, name: 'Team Performance Prediction', date: '2025-04-10', type: 'ML'},
              {id: 3, name: 'Organizational Culture Simulation', date: '2025-04-05', type: 'ABM'}
            ].map(project => (
              <div key={project.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white
                  ${project.type === 'SNA' ? 'bg-purple-500' : 
                    project.type === 'ML' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                  {project.type}
                </div>
                <div className="ml-3 flex-1">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-gray-500">Last modified: {project.date}</div>
                </div>
                <button className="text-gray-400 hover:text-gray-500">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </Card>
        
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Heading level={3}>Module Integration Activity</Heading>
            <button className="text-sm text-blue-600 flex items-center">
              View Details
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="ml-1"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-center">
              <Text variant="caption">Integration Visualization</Text>
              <Text variant="small" className="mt-1">Shows data flow between modules</Text>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <Heading level={3}>Quick Actions</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <button className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex flex-col items-center">
            <Database size={24} className="text-blue-600 mb-2" />
            <Text variant="body">Import New Dataset</Text>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex flex-col items-center">
            <Network size={24} className="text-purple-600 mb-2" />
            <Text variant="body">Create Network Model</Text>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex flex-col items-center">
            <Users size={24} className="text-orange-600 mb-2" />
            <Text variant="body">Run Simulation</Text>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;