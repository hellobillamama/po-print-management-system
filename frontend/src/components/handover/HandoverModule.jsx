import { useState, useMemo, useRef } from 'react';
import {
  Box, Paper, Typography, Button, Checkbox, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Chip, Stack, Accordion, AccordionSummary,
  AccordionDetails, Badge
} from '@mui/material';
import { Handshake, Draw, ExpandMore, Warning, AccessTime } from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function HandoverModule() {
  const { pos, issuePOs, SLA_DAYS } = useApp();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [showSignature, setShowSignature] = useState(false);
  const [activeFactory, setActiveFactory] = useState(null);
  const sigRef = useRef(null);

  // Only show PRINTED POs (ready for handover)
  const printedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'PRINTED'),
    [pos]
  );

  // Group printed POs by Factory (karigar)
  const groupedByFactory = useMemo(() => {
    const groups = {};
    printedPOs.forEach(po => {
      const factory = po.factory || 'UNKNOWN';
      if (!groups[factory]) {
        groups[factory] = [];
      }
      groups[factory].push(po);
    });
    return groups;
  }, [printedPOs]);

  const factories = Object.keys(groupedByFactory).sort();

  // Check SLA status for a PO
  const getSLAStatus = (po) => {
    if (!po.slaDueDate) return 'ok';
    const now = Date.now();
    const due = new Date(po.slaDueDate).getTime();
    const hoursLeft = (due - now) / (1000 * 60 * 60);
    if (hoursLeft < 0) return 'breached';
    if (hoursLeft < 12) return 'warning';
    return 'ok';
  };

  // Select all POs for a factory
  const handleSelectFactory = (factory) => {
    const factoryPOIds = groupedByFactory[factory].map(p => p.id);
    const allSelected = factoryPOIds.every(id => selected.includes(id));

    if (allSelected) {
      setSelected(prev => prev.filter(id => !factoryPOIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...factoryPOIds])]);
    }
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Start handover for a specific factory
  const handleIssue = (factory) => {
    const factoryPOIds = groupedByFactory[factory].map(p => p.id);
    const selectedForFactory = selected.filter(id => factoryPOIds.includes(id));
    if (selectedForFactory.length === 0) return;
    setActiveFactory(factory);
    setShowSignature(true);
  };

  const handleConfirmIssue = () => {
    if (!activeFactory) return;
    const factoryPOIds = groupedByFactory[activeFactory].map(p => p.id);
    const selectedForFactory = selected.filter(id => factoryPOIds.includes(id));

    const signature = sigRef.current?.toDataURL() || '';
    // Karigar name = Factory name (auto-filled)
    issuePOs(selectedForFactory, activeFactory, signature, user);

    // Remove issued POs from selection
    setSelected(prev => prev.filter(id => !selectedForFactory.includes(id)));
    setActiveFactory(null);
    setShowSignature(false);
  };

  const getFactoryStats = (factory) => {
    const factoryPOs = groupedByFactory[factory];
    const selectedCount = factoryPOs.filter(p => selected.includes(p.id)).length;
    const totalQty = factoryPOs.reduce((sum, p) => sum + p.prodQty, 0);
    const selectedQty = factoryPOs.filter(p => selected.includes(p.id)).reduce((sum, p) => sum + p.prodQty, 0);
    const breachedCount = factoryPOs.filter(p => getSLAStatus(p) === 'breached').length;
    return { total: factoryPOs.length, selectedCount, totalQty, selectedQty, breachedCount };
  };

  const totalSelected = selected.length;
  const totalSelectedQty = printedPOs.filter(p => selected.includes(p.id)).reduce((sum, p) => sum + p.prodQty, 0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Karigar Handover</Typography>
      <Typography color="text.secondary" gutterBottom>
        Issue printed POs to karigars (grouped by Factory). Karigar name = Factory name. SLA: {SLA_DAYS} days after printing.
      </Typography>

      {/* Summary Bar */}
      {totalSelected > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={600}>
              Selected: {totalSelected} PO(s) | Total Qty: {totalSelectedQty}
            </Typography>
          </Stack>
        </Paper>
      )}

      {printedPOs.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No printed POs available for handover. Print POs first.
        </Alert>
      ) : (
        <Box>
          {factories.map(factory => {
            const stats = getFactoryStats(factory);
            const factoryPOs = groupedByFactory[factory];
            const allFactorySelected = factoryPOs.every(p => selected.includes(p.id));
            const someFactorySelected = factoryPOs.some(p => selected.includes(p.id));

            return (
              <Accordion key={factory} defaultExpanded={factories.length <= 5}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <Checkbox
                      checked={allFactorySelected}
                      indeterminate={someFactorySelected && !allFactorySelected}
                      onChange={() => handleSelectFactory(factory)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Typography fontWeight={600} sx={{ flex: 1 }}>
                      {factory}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label={`${stats.total} POs`} size="small" color="primary" variant="outlined" />
                      <Chip label={`Qty: ${stats.totalQty}`} size="small" color="info" variant="outlined" />
                      {stats.breachedCount > 0 && (
                        <Chip
                          icon={<Warning />}
                          label={`${stats.breachedCount} SLA breached`}
                          size="small"
                          color="error"
                        />
                      )}
                      {stats.selectedCount > 0 && (
                        <Chip label={`${stats.selectedCount} selected`} size="small" color="success" />
                      )}
                    </Stack>
                    <Button
                      variant="contained"
                      size="small"
                      color="secondary"
                      startIcon={<Handshake />}
                      onClick={(e) => { e.stopPropagation(); handleIssue(factory); }}
                      disabled={stats.selectedCount === 0}
                      sx={{ ml: 1 }}
                    >
                      Handover ({stats.selectedCount})
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={allFactorySelected}
                              indeterminate={someFactorySelected && !allFactorySelected}
                              onChange={() => handleSelectFactory(factory)}
                            />
                          </TableCell>
                          <TableCell>Ord No</TableCell>
                          <TableCell>Style No</TableCell>
                          <TableCell>Buyer</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Printed At</TableCell>
                          <TableCell>SLA Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {factoryPOs.map(po => {
                          const slaStatus = getSLAStatus(po);
                          return (
                            <TableRow
                              key={po.id}
                              hover
                              selected={selected.includes(po.id)}
                              sx={slaStatus === 'breached' ? { bgcolor: 'error.light' } : {}}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selected.includes(po.id)}
                                  onChange={() => handleSelect(po.id)}
                                />
                              </TableCell>
                              <TableCell>{po.ordNo}</TableCell>
                              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {po.styleNo}
                              </TableCell>
                              <TableCell>{po.buyerName}</TableCell>
                              <TableCell>{po.prodQty}</TableCell>
                              <TableCell>{po.printedAt ? new Date(po.printedAt).toLocaleString() : '-'}</TableCell>
                              <TableCell>
                                {slaStatus === 'breached' && (
                                  <Chip icon={<Warning />} label="SLA Breached" size="small" color="error" />
                                )}
                                {slaStatus === 'warning' && (
                                  <Chip icon={<AccessTime />} label="Due Soon" size="small" color="warning" />
                                )}
                                {slaStatus === 'ok' && po.slaDueDate && (
                                  <Chip
                                    icon={<AccessTime />}
                                    label={`Due: ${new Date(po.slaDueDate).toLocaleDateString()}`}
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Signature Dialog */}
      <Dialog open={showSignature} onClose={() => setShowSignature(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Draw sx={{ verticalAlign: 'middle', mr: 1 }} />
          Digital Signature - {activeFactory}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Issuing{' '}
            <strong>
              {activeFactory && groupedByFactory[activeFactory]
                ? selected.filter(id => groupedByFactory[activeFactory].map(p => p.id).includes(id)).length
                : 0}
            </strong>{' '}
            PO(s) to <strong>{activeFactory}</strong>
            {' | '}Total Qty:{' '}
            <strong>
              {activeFactory && groupedByFactory[activeFactory]
                ? groupedByFactory[activeFactory]
                    .filter(p => selected.includes(p.id))
                    .reduce((sum, p) => sum + p.prodQty, 0)
                : 0}
            </strong>
          </Alert>
          <Typography variant="body2" gutterBottom fontWeight={600}>
            Karigar ({activeFactory}) Signature:
          </Typography>
          <Box
            sx={{
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'white',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{
                width: 460,
                height: 200,
                style: { width: '100%', height: 200 },
              }}
            />
          </Box>
          <Button size="small" onClick={() => sigRef.current?.clear()} sx={{ mt: 1 }}>
            Clear Signature
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowSignature(false); setActiveFactory(null); }}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleConfirmIssue}>
            Confirm Handover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
