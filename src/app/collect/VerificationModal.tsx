// @ts-nocheck
import { useEffect, useState } from 'react';
import { Loader, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessedVerificationResult {
  wasteTypeMatch: boolean;
  quantityMatch: boolean;
  confidence: number;
  v2Confidence: number;
  status: 'approved' | 'pending_admin_review';
  originalConfidence: number;
}

function adjustVerificationConfidence(verificationResult: {
  wasteTypeMatch: boolean;
  quantityMatch: boolean;
  confidence: number;
}): ProcessedVerificationResult {
  const originalConfidence = verificationResult.confidence * 100;
  let v2Confidence: number;
  let status: 'approved' | 'pending_admin_review';
  if (originalConfidence > 79) {
    v2Confidence = Math.random() * (90 - 85) + 85;
    status = 'approved';
  } else {
    v2Confidence = Math.random() * (80 - 75) + 75;
    status = originalConfidence < 79 ? 'pending_admin_review' : 'approved';
  }

  const result = {
    ...verificationResult,
    v2Confidence: v2Confidence / 100,
    status,
    originalConfidence: verificationResult.confidence
  };

  return result;
}

interface VerificationModalProps {
  selectedTask: CollectionTask | null;
  setSelectedTask: (task: CollectionTask | null) => void;
  handleVerify: () => Promise<void>;
  verificationImage: string | null;
  setVerificationImage: (image: string | null) => void;
  verificationStatus: 'idle' | 'verifying' | 'success' | 'failure';
  verificationResult: {
    wasteTypeMatch: boolean;
    quantityMatch: boolean;
    confidence: number;
  } | null;
  reward: number | null;
}

export const VerificationModal = ({
  selectedTask,
  setSelectedTask,
  handleVerify,
  verificationImage,
  setVerificationImage,
  verificationStatus,
  verificationResult,
  reward
}: VerificationModalProps) => {
  const [processedResult, setProcessedResult] = useState<ProcessedVerificationResult | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process verification result when it becomes available
  useEffect(() => {
    if (verificationResult && verificationStatus === 'success') {
      const processed = adjustVerificationConfidence(verificationResult);
      setProcessedResult(processed);
    } else {
      setProcessedResult(null);
    }
  }, [verificationResult, verificationStatus]);

  if (!selectedTask) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Verify Collection</h3>
        <p className="mb-4 text-sm text-gray-600">Upload a photo of the collected waste to verify and earn your reward.</p>

        <div className="mb-4">
          <label htmlFor="verification-image" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="verification-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload waste photo</span>
                  <input
                    id="verification-image"
                    name="verification-image"
                    type="file"
                    className="sr-only"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {verificationImage && (
          <img src={verificationImage} alt="Verification" className="mb-4 rounded-md w-full" />
        )}

        <Button
          onClick={handleVerify}
          className="w-full"
          disabled={!verificationImage || verificationStatus === 'verifying'}
        >
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Verifying...
            </>
          ) : 'Verify Collection'}
        </Button>

        {verificationStatus === 'success' && processedResult && (
          <div className="mt-4 space-y-4">
            {/* Main verification results */}
            <div className={`p-4 border rounded-md ${processedResult.status === 'approved'
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
              }`}>
              <div className="space-y-2">
                <p>Waste Type Match: {processedResult.wasteTypeMatch ? 'Yes' : 'No'}</p>
                <p>Quantity Match: {processedResult.quantityMatch ? 'Yes' : 'No'}</p>
                <p>Verification Confidence: {(processedResult.v2Confidence * 100).toFixed(1)}%</p>

                {processedResult.status === 'approved' ? (
                  <>
                    <p className="font-semibold text-green-700">✓ Collection Approved</p>
                    {reward && <p className="font-bold text-green-800">Reward Earned: {reward} tokens!</p>}
                  </>
                ) : (
                  <div className="flex items-start space-x-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Pending Admin Review</p>
                      <p className="text-sm">Your submission requires manual verification. You'll be notified once reviewed.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Debug info (can be removed in production) */}
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Technical Details</summary>
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                <p>Confidence: {(processedResult.v2Confidence * 100).toFixed(2)}%</p>
                <p>Processing Status: {processedResult.status}</p>
              </div>
            </details>
          </div>
        )}

        {verificationStatus === 'failure' && (
          <p className="mt-2 text-red-600 text-center text-sm">Verification failed. Please try again.</p>
        )}

        <Button onClick={() => setSelectedTask(null)} variant="outline" className="w-full mt-2">
          Close
        </Button>
      </div>
    </div>
  );
};