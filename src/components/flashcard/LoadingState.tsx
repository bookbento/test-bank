// LoadingState - Reusable loading spinner component
// Shows animated spinner with message for loading states

interface LoadingStateProps {
  message?: string;
  description?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  description = 'Please wait',
}) => {
  return (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <h2 className="text-xl font-child text-gray-600 mt-4 mb-2">{message}</h2>
      <p className="text-sm font-rounded text-gray-500">{description}</p>
    </div>
  );
};

export default LoadingState;
