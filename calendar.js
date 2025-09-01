document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const timelineContainer = document.getElementById('timeline');
    const eventsContainer = document.getElementById('events-container');
    const timeIndicator = document.getElementById('current-time-indicator');
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const todayBtn = document.getElementById('today-btn');
    const gridColumn = document.getElementById('grid-column');
    const modalOverlay = document.getElementById('event-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const eventForm = document.getElementById('event-form');
    const eventIdInput = document.getElementById('event-id');
    const eventTitleInput = document.getElementById('event-title-input');
    const eventDateInput = document.getElementById('event-date-input');
    const eventStartTimeInput = document.getElementById('event-start-time-input');
    const eventEndTimeInput = document.getElementById('event-end-time-input');
    const eventColorInput = document.getElementById('event-color-input');
    const eventRecurrenceInput = document.getElementById('event-recurrence');
    const weeklyRecurrenceContainer = document.getElementById('weekly-recurrence-options');
    const deleteBtn = document.getElementById('delete-event-btn');
    const cancelBtn = document.getElementById('cancel-event-btn');
    const countdownTitle = document.getElementById('countdown-title');
    const countdownTimer = document.getElementById('countdown-timer');

    // State and Constants
    let displayedDate = new Date();
    const START_HOUR = 6;
    const END_HOUR = 16;
    const PIXELS_PER_MINUTE = 2;
    const STORAGE_KEY = 'calendarUserEvents';

    const defaultEvents = {
        'default': [
            { id: 'd1', start: '06:00', end: '07:00', title: 'Workout 🏋️', colorClass: 'event-blue' },
            { id: 'd2', start: '07:00', end: '07:30', title: 'Breakfast & Log Prio Today', colorClass: 'event-orange' },
            { id: 'd3', start: '08:15', end: '08:30', title: 'Red Room Meeting 📲', colorClass: 'event-red' },
            { id: 'd4', start: '09:00', end: '09:15', title: 'Break Time', colorClass: 'event-green' },
            { id: 'd5', start: '09:30', end: '11:00', title: 'Focus on BAU', colorClass: 'event-yellow' },
            { id: 'd6', start: '11:00', end: '12:00', title: 'Lunch Break', colorClass: 'event-green' },
            { id: 'd7', start: '12:00', end: '14:00', title: 'Focus on Projects', colorClass: 'event-yellow' },
            { id: 'd8', start: '14:00', end: '14:15', title: 'Break Time', colorClass: 'event-green' },
            { id: 'd9', start: '15:45', end: '16:00', title: 'Create EOD and prepare to leave', colorClass: 'event-orange' },
        ],
        'tomorrow': [
             { id: 'd10', start: '11:00', end: '12:00', title: 'Lunch with Sarah', colorClass: 'event-purple' },
        ]
    };
    
    // --- Data Functions ---
    function loadUserEvents() {
        const eventsJSON = localStorage.getItem(STORAGE_KEY);
        return eventsJSON ? JSON.parse(eventsJSON) : [];
    }

    function saveUserEvents(events) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }

    // --- Utility Functions ---
    function getYYYYMMDD(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    }

    // --- Modal Functions ---
    function openModal(data = {}) {
        const { event, date, time } = data;
        eventForm.reset(); 
        if (event) {
            modalTitle.textContent = 'Edit Event';
            eventIdInput.value = event.id;
            eventTitleInput.value = event.title;
            eventDateInput.value = event.startDate || getYYYYMMDD(displayedDate);
            eventStartTimeInput.value = event.start;
            eventEndTimeInput.value = event.end;
            eventColorInput.value = event.colorClass;
            eventRecurrenceInput.value = event.recurrence?.type || 'none';
            document.querySelectorAll('#weekly-recurrence-options input').forEach(cb => cb.checked = false);
            if (event.recurrence?.type === 'weekly' && event.recurrence.days) {
                event.recurrence.days.forEach(dayIndex => {
                    const cb = document.querySelector(`#weekly-recurrence-options input[value="${dayIndex}"]`);
                    if (cb) cb.checked = true;
                });
            }
            deleteBtn.style.display = 'block';
        } else {
            modalTitle.textContent = 'Add Event';
            eventIdInput.value = '';
            eventDateInput.value = getYYYYMMDD(date);
            eventStartTimeInput.value = time;
            const [h, m] = time.split(':').map(Number);
            const endDate = new Date();
            endDate.setHours(h, m + 30, 0, 0);
            eventEndTimeInput.value = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            deleteBtn.style.display = 'none';
        }
        weeklyRecurrenceContainer.style.display = eventRecurrenceInput.value === 'weekly' ? 'block' : 'none';
        modalOverlay.style.display = 'flex';
    }
    function closeModal() { modalOverlay.style.display = 'none'; }

    // --- Calendar Rendering ---
    function updateHeaderDate() {
        document.getElementById('current-year').textContent = displayedDate.getFullYear();
        document.getElementById('current-date').textContent = displayedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    function generateTimeline() {
        timelineContainer.innerHTML = ''; 
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.style.height = `${60 * PIXELS_PER_MINUTE}px`; 
            timeSlot.style.position = 'relative';
            if (hour < END_HOUR) {
                const timeLabel = document.createElement('span');
                timeLabel.style.position = 'relative';
                timeLabel.style.top = '-0.75em';
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                timeLabel.textContent = `${displayHour} ${ampm}`;
                timeSlot.appendChild(timeLabel);
            }
            timelineContainer.appendChild(timeSlot);
        }
    }
    
    function renderEvents() {
        eventsContainer.innerHTML = '';
        const userEvents = loadUserEvents();
        const dateKey = getYYYYMMDD(displayedDate);
        let eventsForDay = [];

        userEvents.forEach(event => {
            const eventStartDate = new Date(event.startDate + 'T00:00:00Z');
            const viewDate = new Date(dateKey + 'T00:00:00Z');
            if (viewDate < eventStartDate) return;

            const recurrence = event.recurrence;
            if (!recurrence || recurrence.type === 'none') {
                if (event.startDate === dateKey) eventsForDay.push(event);
            } else if (recurrence.type === 'daily') {
                eventsForDay.push(event);
            } else if (recurrence.type === 'weekly') {
                if (recurrence.days.includes(displayedDate.getDay())) eventsForDay.push(event);
            }
        });

        const dayOfWeek = displayedDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            eventsForDay.push(...defaultEvents['default']);
        }
        
        const tomorrow = new Date();
        tomorrow.setDate(new Date().getDate() + 1);
        if (dateKey === getYYYYMMDD(tomorrow)) {
            eventsForDay.push(...defaultEvents['tomorrow']);
        }
        
        if (dayOfWeek === 5) { // Friday
            eventsForDay.push({ 
                id: 'd-friday-meeting', 
                start: '10:00', 
                end: '11:00', 
                title: 'Catch up meeting', 
                colorClass: 'event-purple' 
            });
        }

        if (eventsForDay.length === 0) return;

        const processedEvents = eventsForDay.map(e => ({...e, startMinutes: parseInt(e.start.split(':')[0]) * 60 + parseInt(e.start.split(':')[1]), endMinutes: parseInt(e.end.split(':')[0]) * 60 + parseInt(e.end.split(':')[1]) })).sort((a, b) => a.startMinutes - b.startMinutes);
        
        const clusters = [];
        processedEvents.forEach(event => {
            if (event.placed) return;
            let currentCluster = [];
            processedEvents.forEach(otherEvent => { if (!otherEvent.placed && Math.max(event.startMinutes, otherEvent.startMinutes) < Math.min(event.endMinutes, otherEvent.endMinutes)) currentCluster.push(otherEvent); });
            if(currentCluster.length > 0) { currentCluster.forEach(e => e.placed = true); clusters.push(currentCluster); }
        });
        
        clusters.forEach(cluster => {
            const columns = [];
            cluster.sort((a, b) => a.startMinutes - b.startMinutes).forEach(event => {
                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    if (columns[i][columns[i].length - 1].endMinutes <= event.startMinutes) {
                        columns[i].push(event); event.columnIndex = i; placed = true; break;
                    }
                }
                if (!placed) { columns.push([event]); event.columnIndex = columns.length - 1; }
            });
            cluster.forEach(event => event.totalColumns = columns.length);
        });
        
        processedEvents.forEach(event => {
            const durationMinutes = event.endMinutes - event.startMinutes;
            if (durationMinutes <= 0) return;
            const top = (event.startMinutes - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
            const height = durationMinutes * PIXELS_PER_MINUTE;
            const totalColumns = event.totalColumns || 1; const columnIndex = event.columnIndex || 0;
            const width = 100 / totalColumns; const left = columnIndex * width;
            const eventElement = document.createElement('div');
            eventElement.className = `event-item ${event.colorClass}`;
            eventElement.style.top = `${top}px`; eventElement.style.height = `${height}px`; eventElement.style.left = `${left}%`; eventElement.style.width = `calc(${width}% - 4px)`;
            eventElement.innerHTML = `<p class="event-title">${event.title}</p><p class="event-time">${event.start} - ${event.end}</p>`;
            if (!event.id.startsWith('d')) { eventElement.addEventListener('click', (e) => { e.stopPropagation(); openModal({ event }); }); }
            eventsContainer.appendChild(eventElement);
        });
    }

    function updateTimeIndicator() {
        const now = new Date();
        if (getYYYYMMDD(displayedDate) !== getYYYYMMDD(now)) { timeIndicator.style.display = 'none'; return; }
        const currentHour = now.getHours(); const currentMinute = now.getMinutes();
        if (currentHour >= START_HOUR && currentHour < END_HOUR) {
            const totalMinutes = (currentHour * 60) + currentMinute;
            const topPosition = (totalMinutes - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
            timeIndicator.style.top = `${topPosition}px`; timeIndicator.style.display = 'flex';
        } else { timeIndicator.style.display = 'none'; }
    }
    
    // --- Countdown Widget Logic ---
    function updateCountdownWidget() {
        const now = new Date();
        const todayKey = getYYYYMMDD(now);
        
        if(getYYYYMMDD(displayedDate) !== todayKey) {
            countdownTitle.textContent = "Countdown";
            countdownTimer.textContent = "--:--:--";
            return;
        }

        const breakTimes = [
            { time: '09:00', label: 'Next Break In' },
            { time: '11:00', label: 'Lunch Break In' },
            { time: '14:00', label: 'Next Break In' },
            { time: '16:00', label: 'Time Until Clock Out' }
        ];

        const upcomingTargets = breakTimes
            .map(bt => {
                const [h, m] = bt.time.split(':');
                const targetTime = new Date();
                targetTime.setHours(h, m, 0, 0);
                return { ...bt, timeObj: targetTime };
            })
            .filter(bt => bt.timeObj > now)
            .sort((a, b) => a.timeObj - b.timeObj);

        if (upcomingTargets.length > 0) {
            const nextTarget = upcomingTargets[0];
            const diff = nextTarget.timeObj - now;

            const h = Math.floor(diff / 1000 / 60 / 60);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            countdownTitle.textContent = nextTarget.label;
            countdownTimer.innerHTML = `${String(h).padStart(2, '0')}<span>h</span> ${String(m).padStart(2, '0')}<span>m</span> ${String(s).padStart(2, '0')}<span>s</span>`;

        } else {
            countdownTitle.textContent = "Work Day Complete!";
            countdownTimer.textContent = "🎉";
        }
    }

    // --- Main Update Function ---
    function updateCalendar() {
        updateHeaderDate();
        renderEvents();
        updateTimeIndicator();
        updateCountdownWidget();
    }

    // --- Event Handlers ---
    function handleDayChange(days) { displayedDate.setDate(displayedDate.getDate() + days); updateCalendar(); }
    function setToday() { displayedDate = new Date(); updateCalendar(); }
    function handleGridClick(e) {
        const rect = gridColumn.getBoundingClientRect();
        const y = e.clientY - rect.top; const minutesFromStart = Math.floor(y / PIXELS_PER_MINUTE);
        const totalMinutes = (START_HOUR * 60) + minutesFromStart; const hour = Math.floor(totalMinutes / 60);
        const minute = Math.round((totalMinutes % 60) / 15) * 15; const snappedTime = new Date();
        snappedTime.setHours(hour, minute, 0, 0);
        const timeString = `${String(snappedTime.getHours()).padStart(2, '0')}:${String(snappedTime.getMinutes()).padStart(2, '0')}`;
        openModal({ date: displayedDate, time: timeString });
    }
    function handleFormSubmit(e) {
        e.preventDefault(); const id = eventIdInput.value || Date.now().toString();
        const recurrence = { type: eventRecurrenceInput.value };
        if (recurrence.type === 'weekly') { recurrence.days = Array.from(document.querySelectorAll('#weekly-recurrence-options input:checked')).map(cb => parseInt(cb.value)); }
        const newEvent = { id, title: eventTitleInput.value, startDate: eventDateInput.value, start: eventStartTimeInput.value, end: eventEndTimeInput.value, colorClass: eventColorInput.value, recurrence };
        let userEvents = loadUserEvents(); const existingIndex = userEvents.findIndex(e => e.id === id);
        if (existingIndex > -1) { userEvents[existingIndex] = newEvent; } else { userEvents.push(newEvent); }
        saveUserEvents(userEvents); updateCalendar(); closeModal();
    }
    function handleDelete() {
        const id = eventIdInput.value; let userEvents = loadUserEvents();
        userEvents = userEvents.filter(e => e.id !== id);
        saveUserEvents(userEvents); updateCalendar(); closeModal();
    }

    // --- Initial Setup ---
    eventRecurrenceInput.addEventListener('change', () => { weeklyRecurrenceContainer.style.display = eventRecurrenceInput.value === 'weekly' ? 'block' : 'none'; });
    prevDayBtn.addEventListener('click', () => handleDayChange(-1));
    nextDayBtn.addEventListener('click', () => handleDayChange(1));
    todayBtn.addEventListener('click', setToday);
    gridColumn.addEventListener('click', handleGridClick);
    eventForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', closeModal);
    deleteBtn.addEventListener('click', handleDelete);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    generateTimeline();
    updateCalendar();
    setInterval(updateTimeIndicator, 60000);
    setInterval(updateCountdownWidget, 1000);
});

