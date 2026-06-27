import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { API_URL } from "@/lib/api";
import {
  User, Lock, Palette, Bell, Check, Sun, Moon, Monitor, AlertTriangle, LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { toast } = useToast();
  const { user, token, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // ── Profile ──────────────────────────────────────────────
  const [name, setName] = useState(user?.name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const email = user?.email || "";

  // ── Security ─────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    emailExecutions: true,
    emailDefects: true,
    emailMentions: false,
    inAppExecutions: true,
    inAppDefects: true,
    inAppSystem: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    // Load saved notification prefs from localStorage
    const saved = localStorage.getItem("notificationPrefs");
    if (saved) {
      try { setNotifications(JSON.parse(saved)); } catch { }
    }
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/settings/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (user) login(token!, { ...user, name });
      toast({ title: "Profile updated", description: "Your name has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/settings/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveNotifications = () => {
    setIsSavingNotifications(true);
    try {
      localStorage.setItem("notificationPrefs", JSON.stringify(notifications));
      toast({ title: "Notifications saved", description: "Your preferences have been updated." });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleLogoutAllSessions = () => {
    logout();
    navigate("/login");
    toast({ title: "Signed out", description: "You have been signed out of all sessions." });
  };

  const passwordsMatch = newPassword === confirmPassword && newPassword.length >= 6;

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const NotificationRow = ({
    label, description, value, onChange,
  }: {
    label: string; description: string; value: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> Theme
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
                      {name.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted-foreground">{email}</p>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize mt-1 inline-block">
                        {user?.role || "user"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={email} disabled className="bg-muted cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <Button type="submit" disabled={isSavingProfile || !name.trim()}>
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security Tab ── */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="min. 6 characters" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password" required />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                    {confirmPassword && passwordsMatch && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={isSavingPassword || !passwordsMatch}>
                    {isSavingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Sign out all sessions</p>
                    <p className="text-xs text-muted-foreground">Sign out from all devices immediately</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogoutAllSessions}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications Tab ── */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what you want to be notified about</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pb-1">Email Notifications</p>
                <NotificationRow
                  label="Test Executions" description="Receive email when a test is executed"
                  value={notifications.emailExecutions}
                  onChange={(v) => setNotifications(p => ({ ...p, emailExecutions: v }))}
                />
                <Separator />
                <NotificationRow
                  label="Defect Reported" description="Receive email when a defect is filed"
                  value={notifications.emailDefects}
                  onChange={(v) => setNotifications(p => ({ ...p, emailDefects: v }))}
                />
                <Separator />
                <NotificationRow
                  label="Mentions & Comments" description="Receive email when you are mentioned"
                  value={notifications.emailMentions}
                  onChange={(v) => setNotifications(p => ({ ...p, emailMentions: v }))}
                />

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pb-1 pt-4">In-App Notifications</p>
                <NotificationRow
                  label="Test Executions" description="Show notification when a test is run"
                  value={notifications.inAppExecutions}
                  onChange={(v) => setNotifications(p => ({ ...p, inAppExecutions: v }))}
                />
                <Separator />
                <NotificationRow
                  label="Defects" description="Show notification for new defects"
                  value={notifications.inAppDefects}
                  onChange={(v) => setNotifications(p => ({ ...p, inAppDefects: v }))}
                />
                <Separator />
                <NotificationRow
                  label="System Alerts" description="Show system-level notifications"
                  value={notifications.inAppSystem}
                  onChange={(v) => setNotifications(p => ({ ...p, inAppSystem: v }))}
                />

                <div className="pt-4">
                  <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                    {isSavingNotifications ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Appearance Tab ── */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose your preferred colour scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map(({ value, label, icon: Icon }) => (
                      <button key={value} onClick={() => setTheme(value)}
                        className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all hover:bg-muted ${theme === value ? "border-primary bg-primary/5" : "border-border"
                          }`}>
                        <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${theme === value ? "text-primary" : ""}`}>{label}</span>
                        {theme === value && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Current: <span className="font-medium capitalize">{theme}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
