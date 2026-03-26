"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";
import { DeleteSweep, CloudOff, WarningAmber } from "@mui/icons-material";

// --- Types ---
type ActionType = "queue" | "temp" | null;

interface ApiResponse {
  success: boolean;
  count?: number;
  error?: string;
}

export default function StorageAdminPage() {
  // UI State
  const [loading, setLoading] = useState<ActionType>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionType>(null);
  
  // Feedback State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // --- Handlers ---

  const handleOpenConfirm = (action: ActionType) => {
    setPendingAction(action);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setPendingAction(null);
  };

  const showFeedback = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const executePurge = async () => {
    if (!pendingAction) return;

    const endpoint = pendingAction === "queue" ? "/api/clear-queue-uploads" : "/api/clear-temp-files";
    setLoading(pendingAction);
    handleCloseConfirm();

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data: ApiResponse = await response.json();

      if (data.success) {
        showFeedback(`Successfully purged ${data.count ?? 0} files.`, "success");
      } else {
        // Specifically capturing the error message from the JSON if it exists
        const errorMsg = data.error || "Action failed to complete.";
        showFeedback(errorMsg, "error");
      }
    } catch (err) {
      showFeedback("Network error: Could not reach the server.", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
        Storage Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Admin-only utilities to maintain storage health and purge legacy data.
      </Typography>

      <Stack spacing={3}>
        {/* Clear Queue Card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DeleteSweep color="primary" /> Finalized Job Queue
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Permanently deletes all finalized job files from primary storage.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="error"
                disableElevation
                onClick={() => handleOpenConfirm("queue")}
                disabled={loading !== null}
                startIcon={loading === "queue" ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ minWidth: 160, borderRadius: 2 }}
              >
                Purge Queue
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Clear Temp Card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CloudOff color="warning" /> Temporary Uploads
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Purges orphaned temporary files that were never finalized.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleOpenConfirm("temp")}
                disabled={loading !== null}
                startIcon={loading === "temp" ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ minWidth: 160, borderRadius: 2 }}
              >
                Clear Temp
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Confirmation Modal */}
      <Dialog 
        open={confirmOpen} 
        onClose={handleCloseConfirm}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmber color="error" /> Confirm Destruction
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to purge these files? This action is <strong>irreversible</strong> and will immediately free up space on the server.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={handleCloseConfirm} color="inherit">Cancel</Button>
          <Button 
            onClick={executePurge} 
            variant="contained" 
            color="error" 
            autoFocus 
            disableElevation
            sx={{ borderRadius: 2 }}
          >
            Confirm Purge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification System */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}