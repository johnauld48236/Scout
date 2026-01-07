'use client';

import { useState } from 'react';
import { Link2, Plus, Check, ArrowUpRight, X } from 'lucide-react';

interface Deal {
  pursuit_id: string;
  name: string;
  estimated_value: number;
  stage: string;
}

type SparkLinkType = 'linked' | 'converted';

interface SparkDealLinkerProps {
  sparkId: string;
  sparkTitle: string;
  currentLinkedPursuitId: string | null;
  currentConvertedPursuitId: string | null;
  availableDeals: Deal[];
  onLink: (sparkId: string, pursuitId: string | null) => Promise<void>;
  onConvert: (sparkId: string, newDealData?: Partial<Deal>) => Promise<void>;
  onUnlink: (sparkId: string) => Promise<void>;
}

export function SparkDealLinker({
  sparkId,
  sparkTitle,
  currentLinkedPursuitId,
  currentConvertedPursuitId,
  availableDeals,
  onLink,
  onConvert,
  onUnlink,
}: SparkDealLinkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewDealForm, setShowNewDealForm] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const handleLinkToDeal = async (pursuitId: string) => {
    setIsLoading(true);
    try {
      await onLink(sparkId, pursuitId);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleConvertToNewDeal = async () => {
    setIsLoading(true);
    try {
      await onConvert(sparkId);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setShowNewDealForm(false);
    }
  };

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      await onUnlink(sparkId);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const linkedDeal = availableDeals.find((d) => d.pursuit_id === currentLinkedPursuitId);
  const convertedDeal = availableDeals.find((d) => d.pursuit_id === currentConvertedPursuitId);

  // Determine current state
  const isConverted = !!currentConvertedPursuitId;
  const isLinked = !!currentLinkedPursuitId && !isConverted;
  const isExploring = !isConverted && !isLinked;

  return (
    <div className="relative">
      {/* Current State Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border text-sm w-full justify-between
          ${
            isConverted
              ? 'border-green-200 bg-green-50 text-green-700'
              : isLinked
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          {isConverted ? (
            <>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="font-medium">Created from Spark</span>
            </>
          ) : isLinked ? (
            <>
              <Link2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Scout Coverage</span>
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 text-gray-400" />
              <span>Link to CRM Deal</span>
            </>
          )}
        </div>

        {(linkedDeal || convertedDeal) && (
          <span className="text-xs opacity-75">
            {linkedDeal
              ? `${linkedDeal.name} - ${formatCurrency(linkedDeal.estimated_value)}`
              : convertedDeal
                ? `${convertedDeal.name} - ${formatCurrency(convertedDeal.estimated_value)}`
                : ''}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown Panel */}
          <div className="absolute z-20 mt-1 w-80 bg-white rounded-lg shadow-lg border py-1 left-0">
            {/* Header */}
            <div className="px-4 py-2 border-b">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                Spark: {sparkTitle}
              </p>
            </div>

            {/* Current Status */}
            {(isLinked || isConverted) && (
              <div className="px-4 py-2 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isConverted ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        Net New
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        Enrichment
                      </span>
                    )}
                    <span className="text-sm text-gray-700">
                      {linkedDeal?.name || convertedDeal?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleUnlink}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Unlink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ENRICHMENT Section - Link to Existing */}
            {!isConverted && (
              <>
                <div className="px-4 py-2 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">
                      Link to Existing Deal
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Add Scout intelligence to a deal in pipe</p>
                </div>

                {availableDeals.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No deals available to link</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {availableDeals.map((deal) => (
                      <button
                        key={deal.pursuit_id}
                        onClick={() => handleLinkToDeal(deal.pursuit_id)}
                        disabled={deal.pursuit_id === currentConvertedPursuitId}
                        className={`
                          w-full px-4 py-2 text-left text-sm hover:bg-blue-50
                          flex items-center justify-between
                          ${deal.pursuit_id === currentLinkedPursuitId ? 'bg-blue-50' : ''}
                          ${deal.pursuit_id === currentConvertedPursuitId ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{deal.name}</p>
                          <p className="text-gray-500">
                            {formatCurrency(deal.estimated_value)} · {deal.stage}
                          </p>
                        </div>
                        {deal.pursuit_id === currentLinkedPursuitId && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* NET NEW Section - Convert to New Deal */}
            {!isConverted && (
              <>
                <div className="border-t px-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-semibold text-green-700 uppercase">
                      Convert to New Deal
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Create a new CRM deal from this Spark</p>
                </div>

                <div className="px-4 py-2">
                  <button
                    onClick={handleConvertToNewDeal}
                    className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 rounded-md flex items-center gap-2 border border-green-200"
                  >
                    <Plus className="h-4 w-4" />
                    Create New CRM Deal
                  </button>
                </div>
              </>
            )}

            {/* Already Converted Message */}
            {isConverted && (
              <div className="px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                  <ArrowUpRight className="h-5 w-5" />
                  <span className="font-medium">Deal Created from Spark</span>
                </div>
                <p className="text-xs text-gray-500">
                  This Spark has been converted to a CRM deal. To link to a different deal, first
                  unlink the current connection.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
