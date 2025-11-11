# 📅 Διόρθωση Calendar - Electron Support

## Πρόβλημα
Το Calendar προσπαθούσε να κάνει HTTP requests στο `/api/calendar.php` που:
1. Δεν υπάρχει ως endpoint
2. Δεν λειτουργεί στο Electron (ERR_FILE_NOT_FOUND)

## Λύση

Το Calendar τώρα χρησιμοποιεί το **Jobs API** μέσω των σωστών μεθόδων:

### ✅ Αλλαγές στο `calendar.js`

#### 1. Load Events (Φόρτωση Επισκέψεων)
**Πριν:**
```javascript
const response = await API.get(`/api/calendar.php?start=${startStr}&end=${endStr}`);
```

**Μετά:**
```javascript
const jobs = await API.getJobs();
// Filter by date and convert to calendar events
const events = jobs.filter(job => {...}).map(job => ({...}));
```

#### 2. Load Upcoming Visits
**Πριν:**
```javascript
const events = await API.get(`/api/calendar.php?start=${startStr}&end=${endStr}`);
```

**Μετά:**
```javascript
const jobs = await API.getJobs();
const events = jobs.filter(...).map(...);
```

#### 3. Create Visit
**Πριν:**
```javascript
await API.post('/api/calendar.php', data);
// ή
await API.put('/api/calendar.php', { id, next_visit });
```

**Μετά:**
```javascript
if (selectedJobId) {
  await API.updateJob(selectedJobId, { nextVisit: data.start_date });
} else {
  await API.createJob(jobData);
}
```

#### 4. Update Visit
**Πριν:**
```javascript
await API.put('/api/calendar.php', data);
```

**Μετά:**
```javascript
await API.updateJob(event.id, jobData);
```

#### 5. Delete Visit
**Πριν:**
```javascript
await API.delete(`/api/calendar.php?id=${event.id}`);
```

**Μετά:**
```javascript
await API.deleteJob(event.id);
```

#### 6. Load Jobs for Dropdown
**Πριν:**
```javascript
const response = await API.get('/api/jobs.php');
jobs = Array.isArray(response) ? response : (response.data || []);
```

**Μετά:**
```javascript
jobs = await API.getJobs();
```

## Mapping: Jobs → Calendar Events

Τα Jobs μετατρέπονται σε Calendar Events ως εξής:

```javascript
{
  id: job.id,
  title: job.title,
  start: job.nextVisit || job.next_visit || job.startDate || job.start_date,
  backgroundColor: statusColors[job.status],
  extendedProps: {
    job_id: job.id,
    client_id: job.clientId || job.client_id,
    client_name: job.clientName || job.client_name,
    address: job.address,
    status: job.status,
    description: job.description
  }
}
```

## Υποστήριξη snake_case & camelCase

Ο κώδικας τώρα υποστηρίζει και τα δύο formats:

```javascript
const visitDate = job.nextVisit || job.next_visit || job.startDate || job.start_date;
const clientId = job.clientId || job.client_id;
const clientName = job.clientName || job.client_name;
```

## Τι Λειτουργεί Τώρα

✅ Φόρτωση επισκέψεων από SQLite  
✅ Εμφάνιση στο calendar  
✅ Drag & drop για αλλαγή ημερομηνίας  
✅ Δημιουργία νέας επίσκεψης  
✅ Επεξεργασία επίσκεψης  
✅ Διαγραφή επίσκεψης  
✅ Λίστα επόμενων επισκέψεων  
✅ Touch gestures σε mobile  
✅ Ελληνικές αργίες  

## Σημειώσεις

### Calendar.php vs Jobs
- Το `calendar.php` API **ΔΕΝ χρειάζεται πλέον**
- Όλες οι επισκέψεις είναι Jobs με `nextVisit` ημερομηνία
- Το Calendar view είναι απλά ένα visualization layer

### Statistics View
Το `statistics.js` ακόμα χρησιμοποιεί απευθείας API calls επειδή κάνει:
- Aggregations (SUM, COUNT, GROUP BY)
- Multi-year analytics
- Complex calculations

Αυτό θα χρειαστεί:
- Είτε local aggregation functions
- Είτε dedicated statistics methods στο API service

## Testing

```bash
npm start
```

Στο calendar view θα πρέπει να βλέπεις:
- Τις 4 εργασίες από το sync
- Επόμενες επισκέψεις στο sidebar
- Ελληνικές αργίες ως background events
- Δυνατότητα drag & drop (desktop)
- Touch-friendly navigation (mobile)
