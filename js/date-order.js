/* One chronological ordering rule for pages, highlights and CV exports. */
window.CVDateOrder = (() => {
    const fields = ['timelineDate', 'publicationDate', 'grantDate', 'date', 'issuedDate', 'issueDate', 'endDate', 'academicYear', 'year', 'duration', 'filingDate', 'startDate'];
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    function dateKey(value) {
        if (value === undefined || value === null) return null;
        const text = String(value).trim();
        const tokens = [...text.matchAll(/(?:\b([A-Za-z]+)\s+)?\b((?:19|20)\d{2})(?:-(\d{2})(?:-(\d{2}))?)?\b/g)];
        if (!tokens.length) return null;
        const dates = tokens.map(match => {
            const namedMonth = months.indexOf((match[1] || '').slice(0,3).toLowerCase());
            const year = Number(match[2]);
            const month = match[3] ? Number(match[3]) : namedMonth >= 0 ? namedMonth + 1 : 1;
            const day = match[4] ? Number(match[4]) : 1;
            if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
            return year * 10000 + month * 100 + day;
        }).filter(date => date !== null);
        if (!dates.length) return null;
        return {latest: /\b(present|current|ongoing)\b/i.test(text) ? Infinity : Math.max(...dates), start: Math.min(...dates)};
    }
    function itemKey(item) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        for (const field of fields) {
            const key = dateKey(item[field]);
            if (key) return key;
        }
        return null;
    }
    function compare(a, b) {
        const left = itemKey(a), right = itemKey(b);
        if (!left || !right) return left ? -1 : right ? 1 : 0;
        if (left.latest !== right.latest) return left.latest > right.latest ? -1 : 1;
        return right.start - left.start;
    }
    function newestFirst(items) { return [...(items || [])].sort(compare); }
    function sortData(data) {
        if (Array.isArray(data)) return newestFirst(data.map(sortData));
        if (data && typeof data === 'object') return Object.fromEntries(Object.entries(data).map(([key,value]) => [key,sortData(value)]));
        return data;
    }
    return {newestFirst, sortData, compare};
})();
