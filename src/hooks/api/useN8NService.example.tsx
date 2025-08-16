import { useRunWorkflow } from './useN8NService';

// Example component showing how to destructure and use TanStack Query properties
export const WorkflowExample = () => {
  const {
    mutate,
    mutateAsync,
    isLoading,
    isSuccess,
    isError,
    error,
    data,
    reset,
    isPending,
    isIdle,
    status,
    failureCount,
    failureReason
  } = useRunWorkflow();

  const handleRunDefaultWorkflow = () => {
    mutate({
      data: {
        companyName: "Adidas",
        businessLine: "Sportswear",
        country: "Germany",
        useCase: "Leadership",
        timeline: "First quarter"
      }
    });
  };

  const handleRunSpecificWorkflow = async () => {
    try {
      const result = await mutateAsync({
        workflowId: "your-workflow-id",
        data: { any: "data" }
      });
      console.log('Workflow result:', result);
    } catch (error) {
      console.error('Workflow failed:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={handleRunDefaultWorkflow}
        disabled={isLoading || isPending}
      >
        {isLoading || isPending ? 'Running...' : 'Run Default Workflow'}
      </button>

      <button 
        onClick={handleRunSpecificWorkflow}
        disabled={isLoading || isPending}
      >
        Run Specific Workflow
      </button>

      {isSuccess && (
        <div style={{ color: 'green' }}>
          ✅ Workflow executed successfully!
          {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        </div>
      )}

      {isError && (
        <div style={{ color: 'red' }}>
          ❌ Workflow failed: {error?.message}
        </div>
      )}

      <div>
        <p>Status: {status}</p>
        <p>Failure Count: {failureCount}</p>
        {isIdle && <p>Ready to run workflow</p>}
      </div>

      <button onClick={reset} disabled={!isSuccess && !isError}>
        Reset
      </button>
    </div>
  );
};

// Alternative: Destructure only what you need
export const SimpleWorkflowExample = () => {
  const { mutate, isLoading, isSuccess, isError, error } = useRunWorkflow();

  const handleSubmit = () => {
    mutate({
      data: {
        companyName: "Nike",
        businessLine: "Athletic Wear",
        country: "USA",
        useCase: "Marketing",
        timeline: "Q2 2024"
      }
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Submit'}
      </button>
      
      {isSuccess && <p>✅ Success!</p>}
      {isError && <p>❌ Error: {error?.message}</p>}
    </div>
  );
};
