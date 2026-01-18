import React, { useState, useEffect } from 'react';

interface InHouseIssueItem {
  itemName: string;
  itemCode: string;
  transactionType: string;
  batchNo: string;
  issueQty: number;
  reqBy: string;
  inStock: number;
  reqClosed: boolean;
  receivedDate?: string; // FIFO: Track when item was received
}

interface InHouseIssue {
  reqNo: string;
  reqDate: string;
  oaNo: string;
  poNo: string;
  vendor: string;
  purchaseBatchNo: string;
  vendorBatchNo: string;
  issueNo: string;
  items: InHouseIssueItem[];
}

const reqByOptions = ['HKG', 'NGR', 'MDD'];
const transactionTypeOptions = ['Purchase', 'Vendor'];

function getNextReqNo(issues: InHouseIssue[]) {
  const base = 'Req-No-';
  if (issues.length === 0) return base + '01';
  const lastSerial = Math.max(
    ...issues.map(i => {
      const match = i.reqNo.match(/Req-No-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
  const nextSerial = lastSerial + 1;
  return base + String(nextSerial).padStart(2, '0');
}

function getNextIssueNo(issues: InHouseIssue[]) {
  const base = 'IH-ISS-';
  if (issues.length === 0) return base + '01';
  const lastSerial = Math.max(
    ...issues.map(i => {
      const match = i.issueNo.match(/IH-ISS-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
  const nextSerial = lastSerial + 1;
  return base + String(nextSerial).padStart(2, '0');
}

const InHouseIssueModule: React.FC = () => {
  const [issues, setIssues] = useState<InHouseIssue[]>(() => {
    const saved = localStorage.getItem('inHouseIssueData');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((issue: any) => ({
        ...issue,
        items: Array.isArray(issue.items) ? issue.items : [],
      }));
    } catch {
      return [];
    }
  });

  const [newIssue, setNewIssue] = useState<InHouseIssue>({
    reqNo: getNextReqNo([]),
    reqDate: '',
    oaNo: '',
    poNo: '',
    vendor: '',
    purchaseBatchNo: '',
    vendorBatchNo: '',
    issueNo: getNextIssueNo([]),
    items: [],
  });

  const [itemInput, setItemInput] = useState<InHouseIssueItem>({
    itemName: '',
    itemCode: '',
    transactionType: 'Purchase',
    batchNo: '',
    issueQty: 0,
    reqBy: '',
    inStock: 0,
    reqClosed: false,
    receivedDate: new Date().toISOString().slice(0, 10),
  });
  // Removed unused editIdx state

  const [itemNames, setItemNames] = useState<string[]>([]);
  const [itemMaster, setItemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
  const [psirBatchNos, setPsirBatchNos] = useState<string[]>([]);
  const [vsirBatchNos, setVsirBatchNos] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [vendorBatchNos, setVendorBatchNos] = useState<string[]>([]);

  // Helper: Get batch numbers for selected vendor
  const getVendorBatchNos = (vendor: string): string[] => {
    try {
      if (!vendor || !vendor.trim()) {
        return [];
      }
      const purchaseDataRaw = localStorage.getItem('purchaseData');
      if (!purchaseDataRaw) {
        return [];
      }
      const purchaseData = JSON.parse(purchaseDataRaw);
      if (!Array.isArray(purchaseData)) {
        return [];
      }
      const batchNos = new Set<string>();
      purchaseData.forEach((item: any) => {
        if (item.supplierName === vendor && item.vendorBatchNo && item.vendorBatchNo.trim()) {
          batchNos.add(item.vendorBatchNo);
        }
      });
      return Array.from(batchNos).sort();
    } catch (e) {
      console.error('[InHouse] Error getting vendor batch nos:', e);
      return [];
    }
  };

  // Helper: Get batch numbers from VSIR module for an itemCode
  const getVsirBatchNosForItem = (itemCode: string): string[] => {
    try {
      if (!itemCode || !itemCode.trim()) {
        console.log('[InHouse] Empty item code for VSIR, returning empty batch nos');
        return [];
      }
      
      const vsirDataRaw = localStorage.getItem('vsri-records');
      if (!vsirDataRaw) {
        console.log('[InHouse] No VSIR data found in localStorage');
        return [];
      }
      
      const vsirData = JSON.parse(vsirDataRaw);
      if (!Array.isArray(vsirData)) {
        console.log('[InHouse] VSIR data is not an array');
        return [];
      }
      
      const batchNos = new Set<string>();
      vsirData.forEach((record: any) => {
        // Check if this VSIR record contains the item and has vendorBatchNo
        if ((record.itemCode && record.itemCode === itemCode) || (record.Code && record.Code === itemCode)) {
          if (record.vendorBatchNo && record.vendorBatchNo.trim()) {
            console.log('[InHouse] Found vendor batch no for item', itemCode, ':', record.vendorBatchNo);
            batchNos.add(record.vendorBatchNo);
          }
        }
      });
      
      const result = Array.from(batchNos).sort();
      console.log('[InHouse] All VSIR batch nos for', itemCode, ':', result);
      return result;
    } catch (e) {
      console.error('[InHouse] Error getting VSIR batch nos:', e);
      return [];
    }
  };

  // Helper: Get batch numbers from PSIR module for an itemCode
  const getPsirBatchNosForItem = (itemCode: string): string[] => {
    try {
      if (!itemCode || !itemCode.trim()) {
        console.log('[InHouse] Empty item code, returning empty batch nos');
        return [];
      }
      
      const psirDataRaw = localStorage.getItem('psirData');
      if (!psirDataRaw) {
        console.log('[InHouse] No PSIR data found in localStorage');
        return [];
      }
      
      const psirData = JSON.parse(psirDataRaw);
      if (!Array.isArray(psirData)) {
        console.log('[InHouse] PSIR data is not an array');
        return [];
      }
      
      const batchNos = new Set<string>();
      psirData.forEach((psir: any) => {
        // Check if this PSIR record contains the item
        const hasItem = Array.isArray(psir.items) && 
          psir.items.some((item: any) => 
            (item.itemCode && item.itemCode === itemCode) || 
            (item.Code && item.Code === itemCode)
          );
        
        // If item found and PSIR has batchNo, add it to the set
        if (hasItem && psir.batchNo && psir.batchNo.trim()) {
          console.log('[InHouse] Found batch no for item', itemCode, ':', psir.batchNo);
          batchNos.add(psir.batchNo);
        }
      });
      
      const result = Array.from(batchNos).sort();
      console.log('[InHouse] All batch nos for', itemCode, ':', result);
      return result;
    } catch (e) {
      console.error('[InHouse] Error getting PSIR batch nos:', e);
      return [];
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('inHouseIssueData');
    if (savedData) {
      setIssues(JSON.parse(savedData));
    }
    // Fetch Item Names and Codes from Item Master
    const itemMasterRaw = localStorage.getItem('itemMasterData');
    if (itemMasterRaw) {
      try {
        const parsed = JSON.parse(itemMasterRaw);
        if (Array.isArray(parsed)) {
          setItemMaster(parsed);
          setItemNames(parsed.map((item: any) => item.itemName).filter(Boolean));
        }
      } catch {}
    }
    // Fetch Vendors from Purchase data
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    if (purchaseDataRaw) {
      try {
        const parsed = JSON.parse(purchaseDataRaw);
        if (Array.isArray(parsed)) {
          const uniqueVendors = [...new Set(parsed.map((item: any) => item.supplierName).filter(Boolean))];
          setVendors(uniqueVendors);
        }
      } catch {}
    }
  }, []);

  // Update batch numbers when transaction type or item code changes
  useEffect(() => {
    if (itemInput.transactionType === 'Purchase' && itemInput.itemCode) {
      const batchNos = getPsirBatchNosForItem(itemInput.itemCode);
      setPsirBatchNos(batchNos);
      setVsirBatchNos([]);
      console.log('[InHouse] Updated PSIR batch nos for', itemInput.itemCode, ':', batchNos);
    } else if (itemInput.transactionType === 'Vendor' && itemInput.itemCode) {
      const batchNos = getVsirBatchNosForItem(itemInput.itemCode);
      setVsirBatchNos(batchNos);
      setPsirBatchNos([]);
      console.log('[InHouse] Updated VSIR batch nos for', itemInput.itemCode, ':', batchNos);
    } else {
      setPsirBatchNos([]);
      setVsirBatchNos([]);
    }
  }, [itemInput.transactionType, itemInput.itemCode]);

  // Update vendor batch numbers when vendor selection changes
  useEffect(() => {
    if (newIssue.vendor) {
      const batchNosForVendor = getVendorBatchNos(newIssue.vendor);
      setVendorBatchNos(batchNosForVendor);
    } else {
      setVendorBatchNos([]);
    }
  }, [newIssue.vendor]);

  // Auto-add an In House Issue for every new PO in purchaseData if not already present, and fill items from purchase module
  useEffect(() => {
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    let purchaseData = [];
    try {
      purchaseData = purchaseDataRaw ? JSON.parse(purchaseDataRaw) : [];
    } catch {}
    const purchasePOs = purchaseData.map((order: any) => order.poNo).filter(Boolean);
    const existingPOs = new Set(issues.map(issue => issue.poNo));
    let added = false;
    const newIssues = [...issues];
    purchasePOs.forEach((poNo: string) => {
      if (!existingPOs.has(poNo)) {
        const purchaseOrder = purchaseData.find((po: any) => po.poNo === poNo);
        const items = purchaseOrder && Array.isArray(purchaseOrder.items)
          ? purchaseOrder.items.map((item: any) => ({
              itemName: item.itemName || item.model || '',
              itemCode: item.itemCode || '',
              transactionType: 'Purchase',
              batchNo: purchaseOrder?.batchNo || '',
              issueQty: item.qty || 0,
              reqBy: item.reqBy || '',
              inStock: 0,
              reqClosed: false,
            }))
          : [];
        newIssues.push({
          reqNo: '',
          reqDate: '',
          oaNo: '',
          poNo: poNo,
          vendor: purchaseOrder?.supplierName || '',
          purchaseBatchNo: purchaseOrder?.batchNo || '',
          vendorBatchNo: purchaseOrder?.vendorBatchNo || '',
          issueNo: getNextIssueNo(newIssues),
          items,
        });
        added = true;
      }
    });
    if (added) {
      setIssues(newIssues);
      localStorage.setItem('inHouseIssueData', JSON.stringify(newIssues));
    }
    // eslint-disable-next-line
  }, []);

  // When PO No changes, auto-fill Req. No from Vendor Dept DC No if available
  useEffect(() => {
    if (!newIssue.poNo) return;
    const vendorDeptDataRaw = localStorage.getItem('vendorDeptData');
    let vendorDeptData = [];
    try {
      vendorDeptData = vendorDeptDataRaw ? JSON.parse(vendorDeptDataRaw) : [];
    } catch {}
    const match = vendorDeptData.find((order: any) => order.materialPurchasePoNo === newIssue.poNo);
    console.log('[InHouse] vendorDeptData:', vendorDeptData);
    console.log('[InHouse] Selected PO No:', newIssue.poNo);
    console.log('[InHouse] Matched VendorDept order:', match);
    if (match && match.dcNo && newIssue.reqNo !== match.dcNo) {
      console.log('[InHouse] Setting Req. No from VendorDept DC No:', match.dcNo);
      setNewIssue((prev) => {
        const updated = { ...prev, reqNo: match.dcNo };
        console.log('[InHouse] newIssue after Req. No set:', updated);
        return updated;
      });
      return;
    }
    // fallback to purchase module if not found in vendor dept
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    let purchaseData = [];
    try {
      purchaseData = purchaseDataRaw ? JSON.parse(purchaseDataRaw) : [];
    } catch {}
    const matchPurchase = purchaseData.find((order: any) => order.poNo === newIssue.poNo);
    if (matchPurchase && matchPurchase.reqNo && newIssue.reqNo !== matchPurchase.reqNo) {
      console.log('[InHouse] Setting Req. No from Purchase:', matchPurchase.reqNo);
      setNewIssue((prev) => ({ ...prev, reqNo: matchPurchase.reqNo }));
    }
    // eslint-disable-next-line
  }, [newIssue.poNo]);

  const handleAddItem = () => {
    if (!itemInput.itemName || !itemInput.itemCode || !itemInput.reqBy || itemInput.issueQty <= 0) return;
    // Sort items by receivedDate (FIFO - oldest first)
    const newItems = [...newIssue.items, itemInput];
    newItems.sort((a, b) => {
      const dateA = new Date(a.receivedDate || '').getTime();
      const dateB = new Date(b.receivedDate || '').getTime();
      return dateA - dateB;
    });
    setNewIssue({ ...newIssue, items: newItems });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
  };

  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);
  const handleEditItem = (idx: number) => {
    setItemInput(newIssue.items[idx]);
    setEditItemIdx(idx);
  };
  const handleSaveItem = () => {
    if (editItemIdx !== null) {
      setNewIssue(prev => ({
        ...prev,
        items: prev.items.map((item, idx) => idx === editItemIdx ? itemInput : item)
      }));
      setEditItemIdx(null);
      setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false });
    } else {
      handleAddItem();
    }
  };

  const [editIssueIdx, setEditIssueIdx] = useState<number | null>(null);

  const handleEditIssue = (idx: number) => {
    setNewIssue(issues[idx]);
    setEditIssueIdx(idx);
  };

  const handleUpdateIssue = () => {
    if (editIssueIdx === null) return;
    const updated = issues.map((issue, idx) => idx === editIssueIdx ? newIssue : issue);
    setIssues(updated);
    localStorage.setItem('inHouseIssueData', JSON.stringify(updated));
    setNewIssue({ reqNo: getNextReqNo(updated), reqDate: '', oaNo: '', poNo: '', vendor: '', purchaseBatchNo: '', vendorBatchNo: '', issueNo: getNextIssueNo(updated), items: [] });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
    setEditIssueIdx(null);
  };

  const handleAddIssue = () => {
    if (!newIssue.reqDate || !newIssue.poNo || !newIssue.reqNo || newIssue.items.length === 0) return;
    const issueNo = getNextIssueNo(issues);
    const updated = [...issues, { ...newIssue, issueNo }];
    setIssues(updated);
    localStorage.setItem('inHouseIssueData', JSON.stringify(updated));
    setNewIssue({ reqNo: getNextReqNo(updated), reqDate: '', oaNo: '', poNo: '', vendor: '', purchaseBatchNo: '', vendorBatchNo: '', issueNo: getNextIssueNo(updated), items: [] });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'itemName') {
      const found = itemMaster.find(item => item.itemName === value);
      setItemInput({ ...itemInput, itemName: value, itemCode: found ? found.itemCode : '' });
    } else if (name in itemInput) {
      setItemInput({ ...itemInput, [name]: value });
    } else {
      setNewIssue({ ...newIssue, [name]: value });
    }
  };

  return (
    <div>
      <h2>In House Issue Module</h2>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Req. No" value={newIssue.reqNo} readOnly style={{ fontWeight: 'bold', background: '#f0f0f0' }} />
        <input type="date" placeholder="Req. Date" value={newIssue.reqDate} onChange={e => setNewIssue({ ...newIssue, reqDate: e.target.value })} />
        <input type="text" placeholder="OA No" value={newIssue.oaNo} onChange={e => setNewIssue({ ...newIssue, oaNo: e.target.value })} style={{ display: 'none' }} />
        <input placeholder="PO No" value={newIssue.poNo} onChange={e => setNewIssue({ ...newIssue, poNo: e.target.value })} style={{ display: 'none' }} />
        <input type="text" placeholder="Purchase Batch No" value={newIssue.purchaseBatchNo} onChange={e => setNewIssue({ ...newIssue, purchaseBatchNo: e.target.value })} style={{ display: 'none' }} />
        <input placeholder="Issue No" value={newIssue.issueNo} disabled style={{ background: '#eee', display: 'none' }} />
      </div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label>Item Name:</label>
        {itemNames.length > 0 ? (
          <select
            name="itemName"
            value={itemInput.itemName}
            onChange={handleChange}
          >
            <option value="">Select Item Name</option>
            {itemNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            name="itemName"
            value={itemInput.itemName}
            onChange={handleChange}
          />
        )}
        <input placeholder="Item Code" value={itemInput.itemCode} onChange={e => setItemInput({ ...itemInput, itemCode: e.target.value })} />
        <label>Transaction Type:</label>
        <select value={itemInput.transactionType} onChange={e => setItemInput({ ...itemInput, transactionType: e.target.value })}>
          <option value="">Select</option>
          {transactionTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <label>Batch No:</label>
        <select value={itemInput.batchNo} onChange={e => setItemInput({ ...itemInput, batchNo: e.target.value })}>
          <option value="">Select</option>
          {itemInput.transactionType === 'Purchase' ? (
            psirBatchNos && psirBatchNos.length > 0 ? (
              psirBatchNos.map(batchNo => (
                <option key={batchNo} value={batchNo}>{batchNo}</option>
              ))
            ) : (
              <option disabled style={{ color: '#999' }}>No batch numbers available</option>
            )
          ) : itemInput.transactionType === 'Vendor' ? (
            vsirBatchNos && vsirBatchNos.length > 0 ? (
              vsirBatchNos.map(batchNo => (
                <option key={batchNo} value={batchNo}>{batchNo}</option>
              ))
            ) : (
              <option disabled style={{ color: '#999' }}>No vendor batch numbers available</option>
            )
          ) : (
            <option disabled style={{ color: '#999' }}>Select Transaction Type first</option>
          )}
        </select>
        <select value={itemInput.reqBy} onChange={e => setItemInput({ ...itemInput, reqBy: e.target.value })}>
          <option value="">Req By</option>
          {reqByOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <input type="number" placeholder="In Stock" value={itemInput.inStock || ''} onChange={e => setItemInput({ ...itemInput, inStock: Number(e.target.value) })} style={{ display: 'none' }} />
        <input type="date" placeholder="Received Date (FIFO)" value={itemInput.receivedDate || ''} onChange={e => setItemInput({ ...itemInput, receivedDate: e.target.value })} title="Date when item was received - used for FIFO" style={{ display: 'none' }} />
        <input type="number" placeholder="Issue Qty" value={itemInput.issueQty || ''} onChange={e => setItemInput({ ...itemInput, issueQty: Number(e.target.value) })} />
        <label style={{ display: 'none' }}>
          <input type="checkbox" checked={itemInput.reqClosed} onChange={e => setItemInput({ ...itemInput, reqClosed: e.target.checked })} />
          Req Closed
        </label>
  <button onClick={handleSaveItem}>{editItemIdx !== null ? 'Save' : 'Add Item'}</button>
      </div>
      {newIssue.items.length > 0 && (
        <table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Item Code</th>
              <th>Transaction Type</th>
              <th>Batch No</th>
              <th>Req By</th>
              <th>In Stock</th>
              <th>Received Date (FIFO)</th>
              <th>Issue Qty</th>
              <th>Req Closed</th>
            </tr>
          </thead>
          <tbody>
            {newIssue.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.itemName}</td>
                <td>{item.itemCode}</td>
                <td>{item.transactionType}</td>
                <td>{item.batchNo}</td>
                <td>{item.reqBy}</td>
                <td>{item.inStock}</td>
                <td>{item.receivedDate}</td>
                <td>{item.issueQty}</td>
                <td>{item.reqClosed ? 'Yes' : 'No'}</td>
                <td><button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleEditItem(idx)}>Edit</button></td>
                <td><button onClick={() => {
                  setNewIssue(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
                }} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={editIssueIdx !== null ? handleUpdateIssue : handleAddIssue} style={{marginBottom: 16}}>
        {editIssueIdx !== null ? 'Update In House Issue' : 'Add In House Issue'}
      </button>
      <h3>In House Issues</h3>
      <table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Req. No</th>
            <th>Req. Date</th>
            <th>OA No</th>
            <th>PO No</th>
            <th>Vendor</th>
            <th>Purchase Batch No</th>
            <th>Vendor Batch No</th>
            <th>Issue No</th>
            <th>Item Name</th>
            <th>Item Code</th>
            <th>Transaction Type</th>
            <th>Batch No</th>
            <th>Req By</th>
            <th>In Stock</th>
            <th>Received Date (FIFO)</th>
            <th>Issue Qty</th>
            <th>Req Closed</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {issues.flatMap((issue, idx) =>
            issue.items.map((item, i) => (
              <tr key={`${idx}-${i}`}>
                <td>{issue.reqNo}</td>
                <td>{issue.reqDate}</td>
                <td>{issue.oaNo}</td>
                <td>{issue.poNo}</td>
                <td>{issue.vendor}</td>
                <td>{issue.purchaseBatchNo}</td>
                <td>{issue.vendorBatchNo}</td>
                <td>{issue.issueNo}</td>
                <td>{item.itemName}</td>
                <td>{item.itemCode}</td>
                <td>{item.transactionType}</td>
                <td>{item.batchNo}</td>
                <td>{item.reqBy}</td>
                <td>{item.inStock}</td>
                <td>{item.receivedDate}</td>
                <td>{item.issueQty}</td>
                <td>{item.reqClosed ? 'Yes' : 'No'}</td>
                <td><button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleEditIssue(idx)}>Edit</button></td>
                <td><button onClick={() => {
                  setIssues(prevIssues => {
                    const updated = prevIssues.map((iss, issIdx) => {
                      if (issIdx !== idx) return iss;
                      return { ...iss, items: iss.items.filter((_, itemIdx) => itemIdx !== i) };
                    }).filter(iss => iss.items.length > 0);
                    localStorage.setItem('inHouseIssueData', JSON.stringify(updated));
                    return updated;
                  });
                }} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))
         )}
        </tbody>
      </table>
    </div>
  );
};

export default InHouseIssueModule;
