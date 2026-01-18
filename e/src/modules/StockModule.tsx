// Get running total of Vendor Issued Qty for an itemCode from all vendor issues
const getVendorIssuedQtyTotal = (itemCode: string) => {
  try {
    const vendorIssues = JSON.parse(localStorage.getItem("vendorIssueData") || "[]");
    return vendorIssues.reduce((total: number, issue: any) => {
      if (Array.isArray(issue.items)) {
        return (
          total +
          issue.items.reduce(
            (sum: number, item: any) =>
              item.itemCode === itemCode && typeof item.qty === "number" ? sum + item.qty : sum,
            0
          )
        );
      }
      return total;
    }, 0);
  } catch {
    return 0;
  }
};
// Get running total of In-House Issued Qty for an itemCode from all in-house issues
const getInHouseIssuedQtyTotal = (itemCode: string) => {
  try {
    const inHouseIssues = JSON.parse(localStorage.getItem("inHouseIssueData") || "[]");
    return inHouseIssues.reduce((total: number, issue: any) => {
      if (Array.isArray(issue.items)) {
        return (
          total +
          issue.items.reduce(
            (sum: number, item: any) =>
              item.itemCode === itemCode && typeof item.qty === "number" ? sum + item.qty : sum,
            0
          )
        );
      }
      return total;
    }, 0);
  } catch {
    return 0;
  }
};
// Get running total of vendor dept qty for an itemCode from all vendor dept orders
const getVendorDeptQtyTotal = (itemCode: string) => {
  try {
    const vendorDeptOrders = JSON.parse(localStorage.getItem("vendorDeptData") || "[]");
    return vendorDeptOrders.reduce((total: number, order: any) => {
      if (Array.isArray(order.items)) {
        return (
          total +
          order.items.reduce(
            (sum: number, item: any) =>
              item.itemCode === itemCode && typeof item.qty === "number" ? sum + item.qty : sum,
            0
          )
        );
      }
      return total;
    }, 0);
  } catch {
    return 0;
  }
};
import React, { useState, useEffect } from "react";
import bus from '../utils/eventBus';

interface StockRecord {
  id: number;
  itemName: string;
  itemCode: string;
  stockQty: number;
  indentQty: number;
  purchaseQty: number;
  vendorQty: number;
  purStoreOkQty: number;
  vendorOkQty: number;
  inHouseIssuedQty: number;
  vendorIssuedQty: number;
  purchaseActualQtyInStore: number;
  closingStock: number;
}

const LOCAL_STORAGE_KEY = "stock-records";

const STOCK_MODULE_FIELDS = [
  { key: "itemName", label: "Item Name", type: "text" },
  { key: "itemCode", label: "Item Code", type: "text" },
  { key: "stockQty", label: "Stock Qty", type: "number" },
  { key: "indentQty", label: "Indent Qty", type: "number", readOnly: true },
  { key: "purchaseQty", label: "Purchase Qty", type: "number", readOnly: true },
  { key: "vendorQty", label: "Vendor Qty", type: "number", readOnly: true },
  { key: "purStoreOkQty", label: "Pur Store OK Qty", type: "number", readOnly: true },
  { key: "vendorOkQty", label: "Vendor OK Qty", type: "number", readOnly: true },
  { key: "inHouseIssuedQty", label: "In-House Issued Qty", type: "number" },
  { key: "vendorIssuedQty", label: "Vendor Issued Qty", type: "number" },
  { key: "purchaseActualQtyInStore", label: "Purchase Actual Qty in Store", type: "number" },
  { key: "closingStock", label: "Closing Stock", type: "number" }
];
// Get running total of Vendor OK Qty for an itemCode from all vendor dept orders
const getVendorDeptOkQtyTotal = (itemCode: string) => {
  try {
    const vendorDeptOrders = JSON.parse(localStorage.getItem("vendorDeptData") || "[]");
    return vendorDeptOrders.reduce((total: number, order: any) => {
      if (Array.isArray(order.items)) {
        return (
          total +
          order.items.reduce(
            (sum: number, item: any) =>
              item.itemCode === itemCode && typeof item.okQty === "number" ? sum + item.okQty : sum,
            0
          )
        );
      }
      return total;
    }, 0);
  } catch {
    return 0;
  }
};

// Get running total of indent qty for an itemCode from all indents
const getIndentQtyTotal = (itemCode: string) => {
  try {
    const indents = JSON.parse(localStorage.getItem("indentData") || "[]");
    return indents.reduce((total: number, indent: any) => {
      if (Array.isArray(indent.items)) {
        return (
          total +
          indent.items.reduce(
            (sum: number, item: any) =>
              item.itemCode === itemCode && typeof item.qty === "number" ? sum + item.qty : sum,
            0
          )
        );
      }
      return total;
    }, 0);
  } catch {
    return 0;
  }
};

// Get running total of purchase qty for an itemCode from all purchase orders
const getPurchaseQtyTotal = (itemCode: string) => {
  try {
    // Use 'purchaseOrders' for correct source
    const purchaseOrders = JSON.parse(localStorage.getItem("purchaseOrders") || "[]");
    // If purchaseOrders is an array of grouped entries, flatten to items
    let items: any[] = [];
    if (Array.isArray(purchaseOrders)) {
      purchaseOrders.forEach((entry: any) => {
        if (Array.isArray(entry.items)) {
          items = items.concat(entry.items);
        } else if (entry.itemCode && typeof entry.qty === "number") {
          items.push(entry);
        }
      });
    }
    return items.reduce((sum: number, item: any) =>
      item.itemCode === itemCode && typeof item.qty === "number" ? sum + item.qty : sum,
      0
    );
  } catch {
    return 0;
  }
};

const defaultItemInput: Omit<StockRecord, "id"> = {
  itemName: "",
  itemCode: "",
  stockQty: 0,
  indentQty: 0,
  purchaseQty: 0,
  vendorQty: 0,
  purStoreOkQty: 0,
  vendorOkQty: 0,
  inHouseIssuedQty: 0,
  vendorIssuedQty: 0,
  purchaseActualQtyInStore: 0,
  closingStock: 0,
};

const StockModule: React.FC = () => {
  const [itemInput, setItemInput] = useState<Omit<StockRecord, "id">>(defaultItemInput);
  const [records, setRecords] = useState<StockRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [itemMaster, setItemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
  const [draftPsirItems, setDraftPsirItems] = useState<any[]>([]);
  const [lastPsirEventAt, setLastPsirEventAt] = useState<string>('');
  const [lastPsirDetail, setLastPsirDetail] = useState<any>(null);
  const [lastStorageEventAt, setLastStorageEventAt] = useState<string>('');

  // Listen for changes in relevant localStorage keys and reload or force re-render
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === LOCAL_STORAGE_KEY) {
        try {
          setRecords(JSON.parse(e.newValue || "[]"));
        } catch {
          setRecords([]);
        }
      } else if (['indentData', 'purchaseOrders', 'vendorDeptData', 'psirData', 'inHouseIssueData', 'vendorIssueData'].includes(e.key || '')) {
        // Force re-render for calculated fields
        if (e.key === 'psirData') setLastStorageEventAt(new Date().toISOString());
        setRecords(prev => [...prev]);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    // Listen for same-window PSIR updates via the event bus and force re-render
    const psirHandler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        setLastPsirEventAt(new Date().toISOString());
        setLastPsirDetail((ce && (ce as any).detail) || null);
        const det = (ce && (ce as any).detail) || {};
        if (det.draftItem) {
          setDraftPsirItems(prev => [...prev, det.draftItem]);
        } else if (det.psirs) {
          // persisted update — clear drafts
          setDraftPsirItems([]);
        }
      } catch (err) {}
      setRecords(prev => [...prev]);
    };
    try {
      bus.addEventListener('psir.updated', psirHandler as EventListener);
    } catch (err) {
      // no-op
    }
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      try { bus.removeEventListener('psir.updated', psirHandler as EventListener); } catch (err) {}
    };
  }, []);

  // Load item master
  useEffect(() => {
    const itemMasterRaw = localStorage.getItem("itemMasterData");
    if (itemMasterRaw) {
      try {
        setItemMaster(JSON.parse(itemMasterRaw));
      } catch {}
    }
  }, []);

  // Persist records
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    try {
      // Notify other modules that stock has changed so they can re-read current stock
      bus.dispatchEvent(new CustomEvent('stock.updated', { detail: { records } }));
    } catch (err) {
      console.error('[StockModule] Error dispatching stock.updated:', err);
    }
  }, [records]);

  // Calculate total OK Qty from PSIR — match by itemName OR itemCode (normalized)
  const normalize = (s: any) => (s === undefined || s === null ? '' : String(s).trim().toLowerCase());
  const getPSIROkQtyTotal = (itemName: string, itemCode?: string) => {
    try {
      const psirs = JSON.parse(localStorage.getItem("psirData") || "[]");
      const targetName = normalize(itemName);
      const targetCode = normalize(itemCode);

      const totalFromPsirs = psirs.reduce((total: number, psir: any) => {
        if (Array.isArray(psir.items)) {
          return (
            total +
            psir.items.reduce((sum: number, item: any) => {
              const name = normalize(item.itemName || item.Item || '');
              const code = normalize(item.itemCode || item.Code || item.CodeNo || '');
              const okRaw = (item.okQty === undefined || item.okQty === null) ? 0 : Number(item.okQty || 0);
              const qtyReceivedRaw = (item.qtyReceived === undefined || item.qtyReceived === null) ? 0 : Number(item.qtyReceived || 0);
              const ok = okRaw > 0 ? okRaw : qtyReceivedRaw;
              if ((targetName && name === targetName) || (targetCode && code === targetCode)) {
                return sum + ok;
              }
              return sum;
            }, 0)
          );
        }
        return total;
      }, 0);

      // include any draft PSIR items (added in current session but not yet persisted)
      const draftTotal = (draftPsirItems || []).reduce((sum: number, it: any) => {
        const name = normalize(it.itemName || it.Item || '');
        const code = normalize(it.itemCode || it.Code || it.CodeNo || '');
        const okRaw = (it.okQty === undefined || it.okQty === null) ? 0 : Number(it.okQty || 0);
        const qtyReceivedRaw = (it.qtyReceived === undefined || it.qtyReceived === null) ? 0 : Number(it.qtyReceived || 0);
        const ok = okRaw > 0 ? okRaw : qtyReceivedRaw;
        if ((targetName && name === targetName) || (targetCode && code === targetCode)) {
          return sum + ok;
        }
        return sum;
      }, 0);

      return totalFromPsirs + draftTotal;
    } catch {
      return 0;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === "itemName") {
      const found = itemMaster.find((item) => item.itemName === value);
      setItemInput((prev) => ({
        ...prev,
        itemName: value,
        itemCode: found ? found.itemCode : "",
      }));
    } else {
      setItemInput((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemInput.itemName) {
      alert("Item Name is required.");
      return;
    }
    // Auto-calculate all fields except itemName/itemCode/stockQty
    const vendorIssuedTotal = getVendorIssuedQtyTotal(itemInput.itemCode) || 0;
    const vendorDeptTotal = getVendorDeptQtyTotal(itemInput.itemCode) || 0;
    const autoRecord = {
      ...itemInput,
      indentQty: getIndentQtyTotal(itemInput.itemCode) || 0,
      purchaseQty: getPurchaseQtyTotal(itemInput.itemCode) || 0,
      vendorQty: Math.max(0, vendorDeptTotal - vendorIssuedTotal), // Deduct issued qty from vendor dept qty
      purStoreOkQty: getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0,
      vendorOkQty: getVendorDeptOkQtyTotal(itemInput.itemCode) || 0,
      inHouseIssuedQty: getInHouseIssuedQtyTotal(itemInput.itemCode) || 0,
      vendorIssuedQty: vendorIssuedTotal,
      purchaseActualQtyInStore: (getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0) - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0),
      closingStock:
        (Number(itemInput.stockQty) || 0)
        + (getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0)
        + (getVendorDeptOkQtyTotal(itemInput.itemCode) || 0)
        - (getInHouseIssuedQtyTotal(itemInput.itemCode) || 0)
        - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0),
    };
    if (editIdx !== null) {
      setRecords((prev) =>
        prev.map((rec, idx) =>
          idx === editIdx ? { ...autoRecord, id: rec.id } : rec
        )
      );
      setEditIdx(null);
    } else {
      setRecords((prev) => [
        ...prev,
        { ...autoRecord, id: Date.now() },
      ]);
    }
    setItemInput(defaultItemInput);
  };

  const handleEdit = (idx: number) => {
    setItemInput(records[idx]);
    setEditIdx(idx);
  };

  const handleDelete = (idx: number) => {
    setRecords((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <h2>Stock Module</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        {STOCK_MODULE_FIELDS.map((field) => (
          <div key={field.key} style={{ flex: "1 1 200px", minWidth: 180 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{field.label}</label>
            {field.key === "itemName" && itemMaster.length > 0 ? (
              <select
                name="itemName"
                value={itemInput.itemName}
                onChange={handleChange}
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb" }}
              >
                <option value="">Select Item Name</option>
                {itemMaster.map((item) => (
                  <option key={item.itemCode} value={item.itemName}>
                    {item.itemName}
                  </option>
                ))}
              </select>
            ) : field.key === "indentQty" ? (
              <input
                type="number"
                name="indentQty"
                value={getIndentQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "purchaseQty" ? (
              <input
                type="number"
                name="purchaseQty"
                value={getPurchaseQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "vendorQty" ? (
              <input
                type="number"
                name="vendorQty"
                value={Math.max(0, (getVendorDeptQtyTotal(itemInput.itemCode) || 0) - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0))}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "inHouseIssuedQty" ? (
              <input
                type="number"
                name="inHouseIssuedQty"
                value={getInHouseIssuedQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "vendorIssuedQty" ? (
              <input
                type="number"
                name="vendorIssuedQty"
                value={getVendorIssuedQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "purchaseActualQtyInStore" ? (
              <input
                type="number"
                name="purchaseActualQtyInStore"
                value={
                  (getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0) - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0)
                }
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "closingStock" ? (
              <input
                type="number"
                name="closingStock"
                value={
                  (Number(itemInput.stockQty) || 0)
                          + (getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0)
                  + (getVendorDeptOkQtyTotal(itemInput.itemCode) || 0)
                  - (getInHouseIssuedQtyTotal(itemInput.itemCode) || 0)
                  - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0)
                }
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : (
              <input
                type={field.type}
                name={field.key}
                value={(itemInput as any)[field.key] || ""}
                onChange={handleChange}
                required
                readOnly={field.readOnly}
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb" }}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          style={{
            padding: "10px 24px",
            background: "#1a237e",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            marginTop: 24,
          }}
        >
          {editIdx !== null ? "Update" : "Add"}
        </button>
      </form>

      <div style={{ marginBottom: 12, padding: 8, background: '#fff8e1', border: '1px solid #ffecb3', borderRadius: 6 }}>
        <strong>Debug</strong>
        <div>Last psir.updated event: {lastPsirEventAt || '(none)'}</div>
        <div>Last psirData storage event: {lastStorageEventAt || '(none)'}</div>
        {lastPsirDetail && (
          <details style={{ marginTop: 8 }}>
            <summary>Last psir.updated detail</summary>
            <pre style={{ maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(lastPsirDetail, null, 2)}</pre>
          </details>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fafbfc" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3", fontWeight: 600 }}>S.No</th>
              {STOCK_MODULE_FIELDS.map((field) => (
                <th key={field.key} style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3" }}>
                  {field.label}
                </th>
              ))}
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec, idx) => (
              <tr key={rec.id}>
                <td style={{ border: "1px solid #eee", padding: 8 }}>{idx + 1}</td>
                {STOCK_MODULE_FIELDS.map((field) => (
                  <td key={field.key} style={{ border: "1px solid #eee", padding: 8 }}>
                    {field.key === "purStoreOkQty"
                      ? getPSIROkQtyTotal(rec.itemName, rec.itemCode)
                      : field.key === "indentQty"
                      ? getIndentQtyTotal(rec.itemCode)
                      : field.key === "purchaseQty"
                      ? getPurchaseQtyTotal(rec.itemCode)
                      : field.key === "vendorQty"
                      ? Math.max(0, (getVendorDeptQtyTotal(rec.itemCode) || 0) - (getVendorIssuedQtyTotal(rec.itemCode) || 0))
                      : field.key === "vendorOkQty"
                      ? getVendorDeptOkQtyTotal(rec.itemCode)
                      : field.key === "inHouseIssuedQty"
                      ? getInHouseIssuedQtyTotal(rec.itemCode)
                      : field.key === "vendorIssuedQty"
                      ? getVendorIssuedQtyTotal(rec.itemCode)
                      : field.key === "purchaseActualQtyInStore"
                      ? (getPSIROkQtyTotal(rec.itemName, rec.itemCode) || 0) - (getVendorIssuedQtyTotal(rec.itemCode) || 0)
                      : field.key === "closingStock"
                      ? ((Number(rec.stockQty) || 0)
                          + (getPSIROkQtyTotal(rec.itemName, rec.itemCode) || 0)
                          + (getVendorDeptOkQtyTotal(rec.itemCode) || 0)
                          - (getInHouseIssuedQtyTotal(rec.itemCode) || 0)
                          - (getVendorIssuedQtyTotal(rec.itemCode) || 0))
                      : (rec as any)[field.key]}
                  </td>
                ))}
                <td style={{ border: "1px solid #eee", padding: 8 }}>
                  <button
                    style={{ marginRight: 8, background: "#1976d2", color: "#fff", border: "none", padding: "4px 12px" }}
                    onClick={() => handleEdit(idx)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ background: "#e53935", color: "#fff", border: "none", padding: "4px 12px" }}
                    onClick={() => handleDelete(idx)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockModule;