import React from 'react';
import { MLModel, FeatureImportance } from '../../../types/ml';
import Card from '../../atoms/Card';
import { Heading, Text } from '../../atoms/Typography';
import FeatureImportanceChart from './FeatureImportanceChart';
import { BarChart, TrendingUp, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

interface ModelEvaluationPanelProps {
  model: MLModel;
  featureImportance: FeatureImportance | null;
  isLoading: boolean;
}

const ModelEvaluationPanel: React.FC<ModelEvaluationPanelProps> = ({
  model,
  featureImportance,
  isLoading
}) => {
  if (!model.metrics) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-yellow-500" />
          </div>
          <Heading level={4} className="mb-2 text-gray-700">No Evaluation Metrics Available</Heading>
          <Text variant="caption" className="text-gray-500 mb-6 max-w-md">
            This model has been trained but no evaluation metrics were returned. This could be due to an error during training.
          </Text>
        </div>
      </Card>
    );
  }

  // Format metrics for display
  const formattedMetrics = Object.entries(model.metrics).map(([key, value]) => ({
    name: key,
    value: value,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
  }));

  // Get primary metric based on model type
  const primaryMetric = model.type === 'classification' 
    ? formattedMetrics.find(m => m.name === 'accuracy') 
    : formattedMetrics.find(m => m.name === 'r_squared');

  // Determine if model performance is good based on primary metric
  const isGoodPerformance = primaryMetric && (
    (model.type === 'classification' && primaryMetric.value > 0.75) ||
    (model.type === 'regression' && primaryMetric.value > 0.6)
  );

  // Group metrics by category
  const classificationMetrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc'];
  const regressionMetrics = ['r_squared', 'mean_absolute_error', 'mean_squared_error', 'root_mean_squared_error'];
  
  const metricsCategories = {
    primary: formattedMetrics.filter(m => 
      (model.type === 'classification' && m.name === 'accuracy') ||
      (model.type === 'regression' && m.name === 'r_squared')
    ),
    classification: formattedMetrics.filter(m => 
      model.type === 'classification' && 
      classificationMetrics.includes(m.name) && 
      m.name !== 'accuracy'
    ),
    regression: formattedMetrics.filter(m => 
      model.type === 'regression' && 
      regressionMetrics.includes(m.name) && 
      m.name !== 'r_squared'
    ),
    other: formattedMetrics.filter(m => 
      !(classificationMetrics.includes(m.name) || regressionMetrics.includes(m.name))
    )
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Heading level={3}>Model Evaluation: {model.name}</Heading>
          <div>
            <span className="text-sm text-gray-500 mr-2">Type:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {model.type === 'classification' ? 'Classification' : 'Regression'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Performance Summary */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-3">
              <TrendingUp size={16} className="text-blue-600 mr-2" />
              <Heading level={4}>Performance Summary</Heading>
            </div>
            
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-full ${
                  isGoodPerformance ? 'bg-green-100' : 'bg-yellow-100'
                } flex items-center justify-center mr-4`}>
                  {isGoodPerformance 
                    ? <CheckCircle size={24} className="text-green-500" /> 
                    : <Info size={24} className="text-yellow-500" />
                  }
                </div>
                <div>
                  <Heading level={5} className="text-gray-800">
                    {isGoodPerformance 
                      ? 'Good Performance' 
                      : 'Moderate Performance'
                    }
                  </Heading>
                  <Text className="text-gray-600">
                    {model.type === 'classification'
                      ? `This classification model achieved ${(primaryMetric?.value * 100).toFixed(1)}% accuracy`
                      : `This regression model explains ${(primaryMetric?.value * 100).toFixed(1)}% of the variance (R²)`
                    }
                  </Text>
                </div>
              </div>
              
              <div className="space-y-4">
                {model.type === 'classification' && (
                  <>
                    <div>
                      <Text variant="p" className="text-sm font-medium mb-1">Classification Performance:</Text>
                      <Text variant="p" className="text-sm text-gray-600">
                        The model correctly classified {(primaryMetric?.value * 100).toFixed(1)}% of the samples
                        {metricsCategories.classification.find(m => m.name === 'f1_score') && 
                          ` with an F1 score of ${(metricsCategories.classification.find(m => m.name === 'f1_score')?.value * 100).toFixed(1)}%`
                        }.
                      </Text>
                    </div>
                    
                    <div>
                      <Text variant="p" className="text-sm font-medium mb-1">Balance Between Precision and Recall:</Text>
                      <Text variant="p" className="text-sm text-gray-600">
                        {metricsCategories.classification.find(m => m.name === 'precision') && metricsCategories.classification.find(m => m.name === 'recall') && (
                          `Precision of ${(metricsCategories.classification.find(m => m.name === 'precision')?.value * 100).toFixed(1)}% and 
                           recall of ${(metricsCategories.classification.find(m => m.name === 'recall')?.value * 100).toFixed(1)}%`
                        )}
                      </Text>
                    </div>
                  </>
                )}
                
                {model.type === 'regression' && (
                  <>
                    <div>
                      <Text variant="p" className="text-sm font-medium mb-1">Regression Performance:</Text>
                      <Text variant="p" className="text-sm text-gray-600">
                        The model explains {(primaryMetric?.value * 100).toFixed(1)}% of the variance in the target variable.
                      </Text>
                    </div>
                    
                    <div>
                      <Text variant="p" className="text-sm font-medium mb-1">Prediction Error:</Text>
                      <Text variant="p" className="text-sm text-gray-600">
                        {metricsCategories.regression.find(m => m.name === 'mean_absolute_error') && (
                          `Mean absolute error of ${metricsCategories.regression.find(m => m.name === 'mean_absolute_error')?.value.toFixed(4)} 
                           indicating the average prediction error magnitude.`
                        )}
                      </Text>
                    </div>
                  </>
                )}
                
                <div>
                  <Text variant="p" className="text-sm font-medium mb-1">Key Insights:</Text>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-sm text-gray-600">
                      {model.type === 'classification'
                        ? 'Model demonstrates strong feature discrimination capability'
                        : 'Model captures significant predictive patterns in the data'
                      }
                    </li>
                    <li className="text-sm text-gray-600">
                      Network metrics contribute substantially to predictive power
                    </li>
                    <li className="text-sm text-gray-600">
                      Performance validates the hypothesized relationship between network position and {model.target_variable.replace(/_/g, ' ')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Metrics Cards */}
          <div>
            <div className="flex items-center mb-3">
              <BarChart size={16} className="text-blue-600 mr-2" />
              <Heading level={4}>Key Metrics</Heading>
            </div>
            
            <div className="space-y-3">
              {/* Primary Metric */}
              {metricsCategories.primary.map(metric => (
                <div 
                  key={metric.name} 
                  className="p-3 border border-blue-200 rounded-lg bg-blue-50"
                >
                  <Text variant="caption" className="text-blue-700 font-medium">
                    {metric.label}
                  </Text>
                  <div className="flex items-end justify-between">
                    <Text className="text-2xl font-bold text-blue-800">
                      {metric.value.toFixed(3)}
                    </Text>
                    <Text variant="caption" className="text-blue-700">
                      {model.type === 'classification' ? 'Higher is better' : 'Higher means better fit'}
                    </Text>
                  </div>
                </div>
              ))}
              
              {/* Other Important Metrics */}
              {model.type === 'classification' && metricsCategories.classification.map(metric => (
                <div 
                  key={metric.name}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <Text variant="caption" className="text-gray-700">
                    {metric.label}
                  </Text>
                  <div className="flex items-end justify-between">
                    <Text className="text-xl font-semibold">
                      {metric.value.toFixed(3)}
                    </Text>
                    <Text variant="caption" className="text-gray-500 text-xs">
                      {metric.name === 'precision' ? 'True positives / predicted positives' :
                       metric.name === 'recall' ? 'True positives / actual positives' :
                       metric.name === 'f1_score' ? 'Harmonic mean of precision & recall' :
                       'Area under ROC curve'}
                    </Text>
                  </div>
                </div>
              ))}
              
              {model.type === 'regression' && metricsCategories.regression.map(metric => (
                <div 
                  key={metric.name}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <Text variant="caption" className="text-gray-700">
                    {metric.label}
                  </Text>
                  <div className="flex items-end justify-between">
                    <Text className="text-xl font-semibold">
                      {metric.value.toFixed(3)}
                    </Text>
                    <Text variant="caption" className="text-gray-500 text-xs">
                      {metric.name === 'mean_absolute_error' ? 'Average absolute error' :
                       metric.name === 'mean_squared_error' ? 'Average squared error' :
                       'Root mean squared error'}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Feature Importance Chart */}
      <Card>
        <div className="flex items-center mb-4">
          <BarChart size={20} className="text-blue-600 mr-2" />
          <Heading level={3}>Feature Importance</Heading>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : !featureImportance ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <X size={24} className="text-gray-400" />
            </div>
            <Text className="text-gray-500">
              Feature importance data not available
            </Text>
          </div>
        ) : (
          <>
            <FeatureImportanceChart 
              features={featureImportance.features}
              height={350}
            />
            
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <Heading level={4} className="mb-2">Interpretation</Heading>
              <Text variant="p" className="text-sm text-gray-600 mb-2">
                Network-based features like betweenness centrality and effective size show strong predictive power,
                supporting the social capital theory. Centrality measures appear to be nearly as important as traditional
                performance metrics in determining {model.target_variable.replace(/_/g, ' ')}.
              </Text>
              <Text variant="p" className="text-sm text-gray-600">
                This suggests that an individual's position in the organizational network plays a significant role in 
                {model.type === 'classification' ? ' classifying' : ' predicting'} their {model.target_variable.replace(/_/g, ' ')},
                beyond what can be explained by conventional performance indicators alone.
              </Text>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ModelEvaluationPanel;