import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, Check, Info, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";

export function Settings() {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [division, setDivision] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverTitle, setApproverTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  useEffect(() => {
    const profile = api.getProfile();
    setName(profile.name);
    setPosition(profile.position);
    setDivision(profile.division);
    setApproverName(profile.approver_name ?? "");
    setApproverTitle(profile.approver_title ?? "");
    setHasApiKey(profile.has_api_key ?? false);
    setLoading(false);
  }, []);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      api.updateProfile({
        name,
        position,
        division,
        approver_name: approverName || null,
        approver_title: approverTitle || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your profile and application preferences.
          </p>
        </div>

        {/* Profile Section */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-position">Position</Label>
            <Input
              id="profile-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Your position or role"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-division">Division</Label>
            <Input
              id="profile-division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="Your division or department"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-approver-name">Approver Name</Label>
            <Input
              id="profile-approver-name"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Name of your approver"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-approver-title">Approver Title</Label>
            <Input
              id="profile-approver-title"
              value={approverTitle}
              onChange={(e) => setApproverTitle(e.target.value)}
              placeholder="Title of your approver"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </Button>
        </form>

        {/* AI Configuration Section */}
        <Separator className="my-8" />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI Configuration</h2>

          <div className="space-y-1.5">
            <Label htmlFor="ai-api-key">Gemini API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ai-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? "Key is set — enter a new one to replace" : "Enter your Gemini API key"}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                type="button"
                disabled={savingKey || !apiKey.trim()}
                onClick={() => {
                  setSavingKey(true);
                  setSavedKey(false);
                  try {
                    const result = api.setApiKey(apiKey.trim());
                    setHasApiKey(result.has_api_key);
                    setApiKey("");
                    setSavedKey(true);
                    setTimeout(() => setSavedKey(false), 2000);
                  } finally {
                    setSavingKey(false);
                  }
                }}
              >
                {savingKey ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : savedKey ? (
                  <Check className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                {savingKey ? "Saving…" : savedKey ? "Saved" : "Save"}
              </Button>
              {hasApiKey && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingKey}
                  onClick={() => {
                    setSavingKey(true);
                    try {
                      const result = api.setApiKey(null);
                      setHasApiKey(result.has_api_key);
                      setApiKey("");
                    } finally {
                      setSavingKey(false);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>
                {hasApiKey
                  ? "A Gemini API key is currently set. You can replace or remove it above."
                  : "Enter your Gemini API key to enable AI features. The key is stored in your browser's local storage."}{" "}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
