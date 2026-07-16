"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");

  const handleSave = () => {
    // In a real app, send to backend or store securely.
    // For now we just mock success.
    toast.success("Settings saved successfully.");
  };

  return (
    <div className="p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your platform preferences and integrations.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>AI Integration</CardTitle>
          <CardDescription>Configure the Groq API for LLM generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Groq API Key</Label>
            <Input 
              type="password" 
              placeholder="gsk_..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for generating QA test cases. Stored securely on the backend in production.
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Configuration
          </Button>
        </CardContent>
      </Card>
      
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>About TraceWise AI</CardTitle>
          <CardDescription>System Information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Info className="w-5 h-5" />
              <span>TraceWise AI version 1.0.0</span>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="mb-2 font-medium text-foreground">Medical Device Compliance</p>
              <p className="text-muted-foreground">
                This platform is designed to assist with documentation traceability and QA generation. 
                All generated test cases should be reviewed by a qualified engineer before inclusion in official verification records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
