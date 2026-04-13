import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

const STORAGE_KEY = 'wedding-return-tracker-v1'
const STATUS_FLOW = ['ordered', 'delivered', 'in_use', 'return_initiated', 'returned']
const RETURN_METHODS = ['dropoff', 'pickup', 'mail', 'store']
const RETAILER_POLICIES = {
  Amazon: 'Usually 30 days from delivery.',
  Target: 'Typically 90 days for most unopened items.',
  Walmart: 'Most items are 30 to 90 days based on category.',
  Costco: 'Generous policy; verify category-specific limits.',
  Etsy: 'Seller-specific; check listing details.',
}

const RETAILER_WINDOWS = {
  Amazon: 30,
  Target: 90,
  Walmart: 60,
  Costco: 90,
  Etsy: 30,
}

const STARTER_ITEMS = [
  {
    id: 'item-1',
    name: 'String Lights - 200ft',
    category: 'Decor',
    retailer: 'Amazon',
    purchaseDate: dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
    deliveryDate: dayjs().subtract(16, 'day').format('YYYY-MM-DD'),
    returnDeadline: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    price: 84.99,
    orderNumber: 'AMZ-44320',
    returnMethod: 'dropoff',
    status: 'in_use',
    notes: 'Keep original box until return.',
    receiptUrl: '',
  },
  {
    id: 'item-2',
    name: 'Ceremony Arch Frame',
    category: 'Decor',
    retailer: 'Walmart',
    purchaseDate: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
    deliveryDate: dayjs().subtract(11, 'day').format('YYYY-MM-DD'),
    returnDeadline: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    price: 129,
    orderNumber: 'WM-99210',
    returnMethod: 'store',
    status: 'delivered',
    notes: '',
    receiptUrl: '',
  },
]

function getUrgency(deadline, status) {
  if (status === 'returned') return 'normal'

  const daysLeft = dayjs(deadline).endOf('day').diff(dayjs(), 'day')
  if (daysLeft <= 1) return 'critical'
  if (daysLeft <= 3) return 'high'
  if (daysLeft <= 7) return 'medium'
  return 'normal'
}

function createDefaultForm() {
  const delivery = dayjs().format('YYYY-MM-DD')
  return {
    name: '',
    category: 'Decor',
    retailer: 'Amazon',
    purchaseDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate: delivery,
    returnDeadline: dayjs(delivery).add(30, 'day').format('YYYY-MM-DD'),
    price: '',
    orderNumber: '',
    returnMethod: 'dropoff',
    status: 'ordered',
    notes: '',
    receiptUrl: '',
    purchaseUrl: '',
  }
}

function toTitleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function detectRetailer(hostname) {
  const host = hostname.toLowerCase()
  if (host.includes('amazon.')) return 'Amazon'
  if (host.includes('target.')) return 'Target'
  if (host.includes('walmart.')) return 'Walmart'
  if (host.includes('costco.')) return 'Costco'
  if (host.includes('etsy.')) return 'Etsy'
  return ''
}

function inferNameFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const candidate = [...parts].reverse().find((part) => part.length > 4)
  if (!candidate) return ''

  const cleaned = candidate
    .replace(/[-_]+/g, ' ')
    .replace(/\b(dp|gp|product|products|itm|item|p)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length < 4) return ''
  return toTitleCase(cleaned)
}

function inferOrderNumber(urlObject) {
  const params = urlObject.searchParams
  return (
    params.get('orderId') ||
    params.get('order_id') ||
    params.get('orderNumber') ||
    params.get('order') ||
    ''
  )
}

function formatStatus(status) {
  return status.replaceAll('_', ' ')
}

function PhaseTracker({ phase }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : STARTER_ITEMS
  })
  const [form, setForm] = useState(createDefaultForm())
  const [editId, setEditId] = useState('')
  const [filters, setFilters] = useState({ retailer: 'all', category: 'all', status: 'all' })
  const [sortBy, setSortBy] = useState('deadline')
  const [bulkStatus, setBulkStatus] = useState('return_initiated')
  const [selectedIds, setSelectedIds] = useState([])
  const [members, setMembers] = useState([
    { id: 'u1', name: 'Bride', role: 'admin' },
    { id: 'u2', name: 'Best Friend', role: 'contributor' },
  ])
  const [newMember, setNewMember] = useState({ name: '', role: 'contributor' })
  const [scanValue, setScanValue] = useState('')
  const [autoFillStatus, setAutoFillStatus] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const filteredItems = useMemo(() => {
    let next = [...items]
    if (phase >= 2) {
      next = next.filter((item) => {
        const retailerOk = filters.retailer === 'all' || item.retailer === filters.retailer
        const categoryOk = filters.category === 'all' || item.category === filters.category
        const statusOk = filters.status === 'all' || item.status === filters.status
        return retailerOk && categoryOk && statusOk
      })
    }

    next.sort((a, b) => {
      if (sortBy === 'price') return Number(b.price) - Number(a.price)
      return dayjs(a.returnDeadline).valueOf() - dayjs(b.returnDeadline).valueOf()
    })
    return next
  }, [filters, items, phase, sortBy])

  const expiringSoon = useMemo(
    () => filteredItems.filter((item) => getUrgency(item.returnDeadline, item.status) !== 'normal'),
    [filteredItems],
  )

  const byDate = useMemo(() => {
    const map = {}
    for (const item of items) {
      if (!map[item.returnDeadline]) map[item.returnDeadline] = []
      map[item.returnDeadline].push(item)
    }
    return Object.entries(map).sort((a, b) => dayjs(a[0]).valueOf() - dayjs(b[0]).valueOf())
  }, [items])

  const summary = useMemo(() => {
    const dueSoon = items.filter(
      (item) => getUrgency(item.returnDeadline, item.status) !== 'normal' && item.status !== 'returned',
    ).length
    const inUse = items.filter((item) => item.status === 'in_use').length
    const returned = items.filter((item) => item.status === 'returned').length
    return { dueSoon, inUse, returned }
  }, [items])

  function upsertItem(e) {
    e.preventDefault()
    const payload = {
      ...form,
      id: editId || `item-${Date.now()}`,
      price: Number(form.price || 0),
    }

    setItems((prev) => {
      if (!editId) return [payload, ...prev]
      return prev.map((item) => (item.id === editId ? payload : item))
    })

    setForm(createDefaultForm())
    setEditId('')
  }

  function startEdit(item) {
    setEditId(item.id)
    setForm({
      ...item,
      price: String(item.price),
    })
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelectedIds((prev) => prev.filter((selected) => selected !== id))
  }

  function advanceStatus(id) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const current = STATUS_FLOW.indexOf(item.status)
        const nextStatus = STATUS_FLOW[Math.min(current + 1, STATUS_FLOW.length - 1)]
        return { ...item, status: nextStatus }
      }),
    )
  }

  function addMember(e) {
    e.preventDefault()
    if (!newMember.name.trim()) return

    setMembers((prev) => [...prev, { ...newMember, id: `u-${Date.now()}` }])
    setNewMember({ name: '', role: 'contributor' })
  }

  function applyBulkStatus() {
    if (!selectedIds.length) return
    setItems((prev) =>
      prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: bulkStatus } : item)),
    )
    setSelectedIds([])
  }

  function importScannedCode() {
    if (!scanValue.trim()) return
    setForm((prev) => ({ ...prev, orderNumber: scanValue.trim() }))
    setScanValue('')
  }

  function autoFillFromPurchaseUrl() {
    const raw = form.purchaseUrl.trim()
    if (!raw) {
      setAutoFillStatus('Add a purchase URL first.')
      return
    }

    try {
      const parsed = new URL(raw)
      const retailer = detectRetailer(parsed.hostname)
      const inferredName = inferNameFromPath(parsed.pathname)
      const inferredOrder = inferOrderNumber(parsed)
      const returnDays = retailer ? RETAILER_WINDOWS[retailer] || 30 : 30

      setForm((prev) => ({
        ...prev,
        retailer: retailer || prev.retailer,
        name: prev.name || inferredName,
        orderNumber: prev.orderNumber || inferredOrder,
        returnDeadline: dayjs(prev.deliveryDate || dayjs().format('YYYY-MM-DD'))
          .add(returnDays, 'day')
          .format('YYYY-MM-DD'),
      }))

      if (retailer || inferredName || inferredOrder) {
        setAutoFillStatus('Auto-filled details from URL. Please review before saving.')
      } else {
        setAutoFillStatus('URL was valid, but no strong details were detected.')
      }
    } catch {
      setAutoFillStatus('That does not look like a valid URL.')
    }
  }

  function exportCsv() {
    const headers = [
      'name',
      'category',
      'retailer',
      'purchaseDate',
      'deliveryDate',
      'returnDeadline',
      'price',
      'orderNumber',
      'purchaseUrl',
      'returnMethod',
      'status',
      'notes',
    ]

    const csvRows = [headers.join(',')]
    for (const item of items) {
      csvRows.push(headers.map((key) => `"${String(item[key] ?? '').replaceAll('"', '""')}"`).join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wedding-return-tracker.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const retailers = [...new Set(items.map((item) => item.retailer))]
  const categories = [...new Set(items.map((item) => item.category))]

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Wedding Return Tracker</p>
          <h1>Plan Purchases. Track Returns. Avoid Missed Deadlines.</h1>
          <p className="sub">
            Track wedding purchases, protect return windows, and coordinate with your support team.
          </p>
        </div>
        <div className="hero-badge">{items.length} items tracked</div>
      </header>

      <section className="stats">
        <article className="stat">
          <p className="stat-label">Urgent returns</p>
          <strong>{summary.dueSoon}</strong>
        </article>
        <article className="stat">
          <p className="stat-label">Currently in use</p>
          <strong>{summary.inUse}</strong>
        </article>
        <article className="stat">
          <p className="stat-label">Already returned</p>
          <strong>{summary.returned}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Expiring Soon</h2>
        {!expiringSoon.length && <p className="muted">No urgent returns right now.</p>}
        <div className="grid two">
          {expiringSoon.map((item) => {
            const urgency = getUrgency(item.returnDeadline, item.status)
            return (
              <article className={`notice ${urgency}`} key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.retailer}</span>
                <span>
                  Deadline: {item.returnDeadline} ({dayjs(item.returnDeadline).diff(dayjs(), 'day')} days)
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2>{editId ? 'Edit Item' : 'Add Item'}</h2>
        <form onSubmit={upsertItem} className="form-grid">
          <label className="field">
            <span>Item name</span>
            <input required placeholder="String lights" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Category</span>
            <input placeholder="Decor" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label className="field">
            <span>Retailer</span>
            <input placeholder="Amazon" value={form.retailer} onChange={(e) => setForm({ ...form, retailer: e.target.value })} />
          </label>
          <label className="field">
            <span>Purchase date</span>
            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </label>
          <label className="field">
            <span>Delivery date</span>
            <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </label>
          <label className="field">
            <span>Return deadline</span>
            <input type="date" value={form.returnDeadline} onChange={(e) => setForm({ ...form, returnDeadline: e.target.value })} />
          </label>
          <label className="field">
            <span>Price</span>
            <input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </label>
          <label className="field">
            <span>Order number</span>
            <input placeholder="Order #" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
          </label>
          <label className="field full-width">
            <span>Purchase URL</span>
            <div className="url-row">
              <input
                placeholder="https://www.amazon.com/..."
                value={form.purchaseUrl}
                onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })}
              />
              <button type="button" onClick={autoFillFromPurchaseUrl}>
                Auto-fill from URL
              </button>
            </div>
            {!!autoFillStatus && <small className="helper-text">{autoFillStatus}</small>}
          </label>
          <label className="field">
            <span>Return method</span>
            <select value={form.returnMethod} onChange={(e) => setForm({ ...form, returnMethod: e.target.value })}>
              {RETURN_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_FLOW.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field full-width">
            <span>Notes</span>
            <textarea
              placeholder="Keep original packaging until return"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          {phase >= 3 && (
            <label className="field full-width">
              <span>Receipt image URL</span>
              <input
                placeholder="https://..."
                value={form.receiptUrl}
                onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
              />
            </label>
          )}
          <div className="form-actions full-width">
            <button className="btn" type="submit">
              {editId ? 'Update Item' : 'Save Item'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(createDefaultForm())
                setEditId('')
              }}
            >
              Clear
            </button>
          </div>
        </form>
        {phase >= 2 && RETAILER_POLICIES[form.retailer] && (
          <p className="hint">Policy hint: {RETAILER_POLICIES[form.retailer]}</p>
        )}
        {phase >= 3 && (
          <div className="scan-box">
            <input
              placeholder="Paste barcode/QR value"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
            />
            <button type="button" onClick={importScannedCode}>
              Quick Fill Order #
            </button>
          </div>
        )}
      </section>

      {phase >= 2 && (
        <section className="card">
          <h2>Filters and Bulk Updates</h2>
          <div className="toolbar">
            <select value={filters.retailer} onChange={(e) => setFilters({ ...filters, retailer: e.target.value })}>
              <option value="all">All Retailers</option>
              {retailers.map((retailer) => (
                <option key={retailer} value={retailer}>
                  {retailer}
                </option>
              ))}
            </select>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All Statuses</option>
              {STATUS_FLOW.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="deadline">Sort by deadline</option>
              <option value="price">Sort by price</option>
            </select>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              {STATUS_FLOW.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="button" onClick={applyBulkStatus}>
              Apply to Selected ({selectedIds.length})
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Items</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {phase >= 2 && <th />}
                <th>Name</th>
                <th>Retailer</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!filteredItems.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No items match your filters.
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const urgency = getUrgency(item.returnDeadline, item.status)
                return (
                  <tr key={item.id} className={`row-${urgency}`}>
                    {phase >= 2 && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, item.id])
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== item.id))
                            }
                          }}
                        />
                      </td>
                    )}
                    <td>
                      <strong>{item.name}</strong>
                      <p className="tiny">{item.notes || 'No notes'}</p>
                    </td>
                    <td>{item.retailer}</td>
                    <td>
                      <div className="deadline-cell">
                        <strong>{item.returnDeadline}</strong>
                        <span className={`deadline-chip ${urgency}`}>
                          {item.status === 'returned'
                            ? 'Completed'
                            : `${dayjs(item.returnDeadline).diff(dayjs(), 'day')} days left`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{formatStatus(item.status)}</span>
                    </td>
                    <td className="actions">
                      <button className="btn-soft" type="button" onClick={() => advanceStatus(item.id)}>
                        Next Status
                      </button>
                      <button className="btn-soft" type="button" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button className="btn-danger" type="button" onClick={() => removeItem(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {phase >= 2 && (
        <section className="card">
          <h2>Collaborators</h2>
          <div className="grid two">
            {members.map((member) => (
              <article key={member.id} className="member">
                <strong>{member.name}</strong>
                <span>{member.role}</span>
              </article>
            ))}
          </div>
          <form className="inline-form" onSubmit={addMember}>
            <input
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
            >
              <option value="admin">admin</option>
              <option value="contributor">contributor</option>
            </select>
            <button type="submit">Add Collaborator</button>
          </form>
        </section>
      )}

      {phase >= 3 && (
        <>
          <section className="card">
            <h2>Calendar View</h2>
            <div className="calendar-list">
              {byDate.map(([date, dateItems]) => (
                <article key={date} className="calendar-date">
                  <h3>{dayjs(date).format('MMM D, YYYY')}</h3>
                  <ul>
                    {dateItems.map((item) => (
                      <li key={item.id}>
                        {item.name} - {item.status}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Exports and Records</h2>
            <div className="toolbar">
              <button type="button" onClick={exportCsv}>
                Export CSV
              </button>
              <button type="button" onClick={() => window.print()}>
                Save as PDF
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function App() {
  return <PhaseTracker phase={3} />
}

export default App
