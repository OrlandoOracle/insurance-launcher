'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, AlertCircle } from 'lucide-react';
import { fs } from '@/lib/fs';
import { indexService } from '@/lib/index';

interface StorageGateProps {
  children: React.ReactNode;
}

export function StorageGate({ children }: StorageGateProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFS, setHasFS] = useState(false);

  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);
    
    // Check for File System Access API
    const fsAvailable = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    setHasFS(fsAvailable);
    
    // Only try to restore if API is available
    if (fsAvailable) {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const restored = await fs.restore();
      if (restored) {
        await indexService.load();
        setIsConnected(true);
      }
    } catch (err: unknown) {
      console.error('Failed to restore connection:', err);
      setError('Failed to restore previous connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await fs.connect();
      if (connected) {
        await indexService.load();
        setIsConnected(true);
      } else {
        setError('Connection cancelled or denied');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'Failed to connect to storage'));
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    await fs.disconnect();
    setIsConnected(false);
    await handleConnect();
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-pulse">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check browser compatibility after hydration
  if (!hasFS) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Browser Not Supported</CardTitle>
            <CardDescription>
              File System Access API is not available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">
                  This app requires the File System Access API, which is not available in your browser.
                </p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Supported browsers:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Google Chrome 86+</li>
                  <li>Microsoft Edge 86+</li>
                  <li>Other Chromium-based browsers</li>
                </ul>
                <p className="mt-4">Please open this app in Chrome or Edge to continue.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-pulse">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Checking storage connection...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connect to Storage</CardTitle>
            <CardDescription>
              Select your InsuranceData folder on the external drive to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleConnect} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              <FolderOpen className="mr-2 h-5 w-5" />
              {isLoading ? 'Connecting...' : 'Connect Storage'}
            </Button>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Make sure your external drive is connected</p>
              <p>• You&apos;ll be prompted to select the InsuranceData folder</p>
              <p>• Grant permission for read/write access when asked</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {children}
      <ReconnectToast onReconnect={handleReconnect} />
    </>
  );
}

function ReconnectToast({ onReconnect }: { onReconnect: () => void }) {
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!fs.isConnected()) {
        setShowReconnect(true);
        return;
      }

      const handle = fs.getRootHandle();
      if (handle) {
        try {
          // @ts-expect-error: File System Access API not in TS lib
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission !== 'granted') {
            setShowReconnect(true);
          }
        } catch (e: unknown) {
          setShowReconnect(true);
        }
      }
    };

    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!showReconnect) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Storage Disconnected</p>
              <p className="text-xs text-muted-foreground">
                Permission to access storage was lost. Reconnect to continue.
              </p>
              <Button size="sm" onClick={onReconnect}>
                Reconnect Storage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}