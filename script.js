// Plant Care Assistant JavaScript

class PlantCareAssistant {
    constructor() {
        this.plants = this.loadPlantsFromStorage();
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderPlants();
        this.renderCalendar();
    }

    bindEvents() {
        // Form submission
        document.getElementById('plantForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPlant();
        });

        // Photo preview
        document.getElementById('plantPhoto').addEventListener('change', (e) => {
            this.previewPhoto(e.target.files[0]);
        });

        // Handle plant deletion
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const plantId = e.target.closest('.plant-card').dataset.plantId;
                this.deletePlant(plantId);
            }
        });
    }

    addPlant() {
        const form = document.getElementById('plantForm');
        const formData = new FormData(form);
        
        const plantName = formData.get('plantName').trim();
        const plantType = formData.get('plantType').trim();
        const wateringFrequency = parseInt(formData.get('wateringFrequency'));
        const photoFile = formData.get('plantPhoto');

        if (!plantName || !plantType || !wateringFrequency) {
            alert('Please fill in all required fields!');
            return;
        }

        const plant = {
            id: Date.now().toString(),
            name: plantName,
            type: plantType,
            frequency: wateringFrequency,
            photo: null,
            dateAdded: new Date().toISOString()
        };

        // Handle photo upload
        if (photoFile && photoFile.size > 0) {
            this.convertToBase64(photoFile).then(base64 => {
                plant.photo = base64;
                this.savePlant(plant);
            });
        } else {
            this.savePlant(plant);
        }
    }

    convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    previewPhoto(file) {
        const preview = document.getElementById('photoPreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }

    savePlant(plant) {
        this.plants.push(plant);
        this.savePlantsToStorage();
        this.renderPlants();
        this.renderCalendar();
        this.resetForm();
        
        // Show success message
        this.showMessage(`🌱 ${plant.name} has been added to your collection!`, 'success');
    }

    deletePlant(plantId) {
        const plant = this.plants.find(p => p.id === plantId);
        if (plant && confirm(`Are you sure you want to remove ${plant.name} from your collection?`)) {
            this.plants = this.plants.filter(p => p.id !== plantId);
            this.savePlantsToStorage();
            this.renderPlants();
            this.renderCalendar();
            this.showMessage(`${plant.name} has been removed from your collection.`, 'info');
        }
    }

    resetForm() {
        document.getElementById('plantForm').reset();
        document.getElementById('photoPreview').innerHTML = '';
    }

    renderPlants() {
        const plantsContainer = document.getElementById('plantsList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.plants.length === 0) {
            plantsContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        plantsContainer.innerHTML = this.plants.map(plant => this.createPlantCard(plant)).join('');
    }

    createPlantCard(plant) {
        const photoElement = plant.photo 
            ? `<img src="${plant.photo}" alt="${plant.name}" class="plant-photo">`
            : `<div class="plant-photo default">🌿</div>`;

        return `
            <div class="plant-card" data-plant-id="${plant.id}">
                <button class="delete-btn" title="Remove plant">×</button>
                ${photoElement}
                <h3 class="plant-name">${this.escapeHtml(plant.name)}</h3>
                <p class="plant-type">${this.escapeHtml(plant.type)}</p>
                <span class="plant-frequency">💧 Every ${plant.frequency} day${plant.frequency > 1 ? 's' : ''}</span>
            </div>
        `;
    }

    renderCalendar() {
        const calendarContainer = document.getElementById('calendar');
        const today = new Date();
        const calendarDays = [];

        // Generate 30 days starting from today
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dayData = {
                date: date,
                dateString: date.toISOString().split('T')[0],
                dayName: date.toLocaleDateString('en', { weekday: 'short' }),
                dayNumber: date.getDate(),
                month: date.toLocaleDateString('en', { month: 'short' }),
                wateringEvents: this.getWateringEventsForDate(date)
            };
            
            calendarDays.push(dayData);
        }

        calendarContainer.innerHTML = calendarDays.map(day => this.createCalendarDay(day)).join('');
    }

    createCalendarDay(day) {
        const hasWatering = day.wateringEvents.length > 0;
        const eventsHtml = day.wateringEvents.map(event => 
            `<div class="watering-event">💧 ${this.escapeHtml(event.plantName)}</div>`
        ).join('');

        return `
            <div class="calendar-day ${hasWatering ? 'has-watering' : ''}">
                <div class="day-date">
                    <div>${day.dayName}</div>
                    <div>${day.month} ${day.dayNumber}</div>
                </div>
                <div class="day-events">
                    ${eventsHtml}
                </div>
            </div>
        `;
    }

    getWateringEventsForDate(targetDate) {
        const events = [];
        const targetDateString = targetDate.toISOString().split('T')[0];

        this.plants.forEach(plant => {
            const plantAddedDate = new Date(plant.dateAdded);
            const daysSinceAdded = Math.floor((targetDate - plantAddedDate) / (1000 * 60 * 60 * 24));
            
            // Check if this date is a watering day for this plant
            if (daysSinceAdded >= 0 && daysSinceAdded % plant.frequency === 0) {
                events.push({
                    plantId: plant.id,
                    plantName: plant.name,
                    plantType: plant.type
                });
            }
        });

        return events;
    }

    loadPlantsFromStorage() {
        try {
            const stored = localStorage.getItem('plantCareAssistant_plants');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading plants from storage:', error);
            return [];
        }
    }

    savePlantsToStorage() {
        try {
            localStorage.setItem('plantCareAssistant_plants', JSON.stringify(this.plants));
        } catch (error) {
            console.error('Error saving plants to storage:', error);
            alert('Unable to save plant data. Your browser storage might be full.');
        }
    }

    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #5eaaa8, #6a5acd);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(94, 170, 168, 0.3);
            z-index: 1000;
            font-weight: 600;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(messageEl);

        // Auto remove after 3 seconds
        setTimeout(() => {
            messageEl.style.transform = 'translateX(100%)';
            messageEl.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlantCareAssistant();
});

// Add some helpful utility functions
window.PlantCareUtils = {
    exportData: function() {
        const data = localStorage.getItem('plantCareAssistant_plants');
        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plant-care-data.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    },
    
    importData: function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                localStorage.setItem('plantCareAssistant_plants', JSON.stringify(data));
                location.reload();
            } catch (error) {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    },
    
    clearAllData: function() {
        if (confirm('Are you sure you want to delete all plant data? This cannot be undone.')) {
            localStorage.removeItem('plantCareAssistant_plants');
            location.reload();
        }
    }
};