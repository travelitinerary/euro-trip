import React, { useState, useEffect } from 'react';
import './App.css';

// Helper function to parse dates in "DD-MMM-YY" format
const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    console.log('Invalid date string:', dateStr);
    return null;
  }
  
  // Clean the date string
  dateStr = dateStr.trim();
  
  const [day, month, year] = dateStr.split('-');
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  if (!day || !month || !year || !months.hasOwnProperty(month)) {
    console.log('Invalid date format:', dateStr);
    return null;
  }

  return new Date(2000 + parseInt(year), months[month], parseInt(day));
};

const filterTripsByDate = (trips, selectedDateStr) => {
  if (!selectedDateStr || !trips.length) {
    console.log('No date or trips to filter:', { selectedDateStr, tripsLength: trips.length });
    return [];
  }
  
  const selectedDate = parseDate(selectedDateStr);
  if (!selectedDate) {
    console.log('Could not parse selected date:', selectedDateStr);
    return [];
  }
  
  const filteredTrips = trips.filter(trip => {
    const startDate = parseDate(trip.dateFrom);
    const endDate = parseDate(trip.dateTo);
    
    if (!startDate || !endDate) {
      console.log('Invalid date range for trip:', trip);
      return false;
    }
    
    return startDate <= selectedDate && selectedDate <= endDate;
  });

  console.log('Filtered trips:', filteredTrips);
  return filteredTrips;
};

const formatDateForDisplay = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

function App() {
  const [trips, setTrips] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [uniqueDates, setUniqueDates] = useState([]);

  const parseCSVData = (csvText) => {
    // Split the CSV into lines and remove empty lines and duplicates
    const lines = csvText
      .split('\n')
      .filter(line => line.trim())
      .filter(line => !line.startsWith('Total'))  // Remove total lines
      .filter((line, index, self) => 
        index === self.findIndex((t) => t === line)  // Remove duplicates
      );
    
    const headers = lines[0].split(',');
    const dateFromIndex = headers.findIndex(h => h.trim().toLowerCase() === 'date from');
    const dateToIndex = headers.findIndex(h => h.trim().toLowerCase() === 'date to');
    
    const tripData = [];
    let currentTrip = null;
    
    // Start from index 1 to skip headers
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(val => val.trim());
      
      // If this line has a destination, it's a new trip
      if (values[0]) {
        if (currentTrip) {
          tripData.push(currentTrip);
        }
        
        currentTrip = {
          destination: values[0],
          days: parseInt(values[1]) || 0,
          dateFrom: values[dateFromIndex],
          dateTo: values[dateToIndex],
          travelTime: values[4],
          flight: values[5],
          status: values[6],
          accommodation: values[7],
          comments: values[8] || null,
          recommendations: values[9] || null,
          notes: values[10] || null  // Set to null if empty/undefined
        };
      } else if (currentTrip) {
        // If no destination but has additional info, append to previous trip's fields
        if (values[8]) {
          currentTrip.comments = currentTrip.comments 
            ? `${currentTrip.comments}\n${values[8]}`
            : values[8];
        }
        if (values[9]) {
          currentTrip.recommendations = currentTrip.recommendations 
            ? `${currentTrip.recommendations}\n${values[9]}`
            : values[9];
        }
      }
    }
    
    // Don't forget to push the last trip
    if (currentTrip) {
      tripData.push(currentTrip);
    }
    
    // Filter out invalid entries and log the valid ones
    const validTrips = tripData.filter(trip => {
      const isValid = trip.destination && trip.dateFrom && trip.dateTo;
      if (!isValid) {
        console.log('Filtered out invalid trip:', trip);
      }
      return isValid;
    });

    console.log('Valid trips:', validTrips);
    return validTrips;
  };

  useEffect(() => {
    // Get the base URL from Vite
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Construct the CSV path relative to the base URL
    const csvPath = `${baseUrl}mytrip.csv`;

    // Fetch the CSV file
    fetch(csvPath)
      .then(response => response.text())
      .then(csvText => {
        const tripData = parseCSVData(csvText);
        console.log('Loaded trip data:', tripData);
        
        // Create array of unique dates from all trips
        const dates = tripData.reduce((acc, trip) => {
          const fromDate = parseDate(trip.dateFrom);
          const toDate = parseDate(trip.dateTo);
          
          if (fromDate && toDate) {
            for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
              const dateStr = formatDateForDisplay(d);
              acc.add(dateStr);
            }
          }
          return acc;
        }, new Set());
        
        const uniqueDatesArray = Array.from(dates).sort((a, b) => 
          parseDate(a) - parseDate(b)
        );
        
        console.log('Unique dates:', uniqueDatesArray);
        setUniqueDates(uniqueDatesArray);
        setSelectedDate(uniqueDatesArray[0]);
        setTrips(tripData);
      })
      .catch(error => console.error('Error loading trip data:', error));
  }, []);

  console.log('Current state:', { selectedDate, trips: trips.length });

  return (
    <div className="app">
      <header className="header">
        <h1>Euro Trip 2024-25</h1>
      </header>

      <div className="date-tabs">
        {uniqueDates.map(date => (
          <button
            key={date}
            className={`date-tab ${selectedDate === date ? 'active' : ''}`}
            onClick={() => setSelectedDate(date)}
          >
            {date}
          </button>
        ))}
      </div>
      
      <div className="trip-container">
        {filterTripsByDate(trips, selectedDate).map((trip, index) => (
          <div key={`${trip.destination}-${trip.dateFrom}-${index}`} className="trip-card">
            <div className="trip-header">
              <h2>{trip.destination}</h2>
              <span className="status" data-status={trip.status}>
                {trip.status}
              </span>
            </div>
            
            <div className="trip-details">
              <div className="date-section">
                <p>From: {trip.dateFrom}</p>
                <p>To: {trip.dateTo}</p>
                <p>Duration: {trip.days} days</p>
              </div>
              
              {trip.flight && (
                <div className="flight-section">
                  <h3>Flight Details</h3>
                  <p>{trip.flight}</p>
                </div>
              )}
              
              {trip.accommodation && (
                <div className="accommodation-section">
                  <h3>Accommodation</h3>
                  <p>{trip.accommodation}</p>
                </div>
              )}
              
              {trip.comments && trip.comments.trim().length > 0 && (
                <div className="comments-section">
                  <h3>Notes</h3>
                  <p>{trip.comments}</p>
                </div>
              )}
            </div>
            
            {trip.recommendations && trip.recommendations.trim().length > 0 && (
              <div className="recommendations-section">
                <h3>Recommendations</h3>
                <ul>
                  {trip.recommendations
                    .split(';')
                    .map(item => item.trim())
                    .filter(item => item.length > 0)
                    .map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  }
                </ul>
              </div>
            )}
            
            {trip.notes && typeof trip.notes === 'string' && trip.notes.trim().length > 0 ? (
              <div className="notes-section">
                <h3>Additional Notes</h3>
                <p>{trip.notes}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;