// Trail Status Logic
document.addEventListener('DOMContentLoaded', function() {
    function updateTrailStatus() {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDay = now.getDate();
        
        // Trail is closed from November 1st to March 31st
        const isClosed = (currentMonth === 11 || currentMonth === 12 || currentMonth === 1 || currentMonth === 2 || currentMonth === 3);
        
        const statusCard = document.getElementById('trail-status');
        const statusIcon = document.getElementById('status-icon');
        const statusMessage = document.getElementById('status-message');
        const statusButton = document.getElementById('status-button');
        
        if (isClosed) {
            // Trail is closed
            statusCard.classList.add('closed');
            statusCard.classList.remove('open');
            statusIcon.className = 'fas fa-ban';
            statusMessage.textContent = `Trail ist geschlossen (1. November - 31. März). Aktuelle Informationen über Wetterbedingungen und Wiedereröffnung.`;
            statusButton.innerHTML = '<i class="fab fa-facebook"></i> Facebook für Updates';
        } else {
            // Trail is open
            statusCard.classList.add('open');
            statusCard.classList.remove('closed');
            statusIcon.className = 'fas fa-bicycle';
            statusMessage.textContent = 'Trail ist grundsätzlich geöffnet (1. April - 31. Oktober). Temporäre Sperrungen werden auf Facebook veröffentlicht - bitte vor dem Besuch prüfen.';
            statusButton.innerHTML = '<i class="fab fa-facebook"></i> Facebook für aktuelle Updates';
        }
    }
    
    // Update trail status on page load
    updateTrailStatus();
    
    console.log('Devils Rock Trails Website loaded successfully!');
}); 