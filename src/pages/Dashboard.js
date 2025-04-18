import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Badge } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../services/Firebase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register the required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [occupancy, setOccupancy] = useState(0);
  const [averageStay, setAverageStay] = useState("0 hours");
  const [occupancyData, setOccupancyData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("UCF RWC");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Get the current day of the week
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDay = daysOfWeek[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(currentDay);

  useEffect(() => {
    const activityLogRef = ref(database, "activityLog");
    const occupancyRef = ref(database, `stats/occupancy/${selectedLocation}`);
    const averageStayRef = ref(
      database,
      `stats/average_stay/${selectedLocation}`
    );
    const histogramRef = ref(
      database,
      `stats/histogram/${selectedLocation}/${selectedDay}`
    );

    // Listener for activity log
    const unsubscribeActivityLog = onValue(activityLogRef, (snapshot) => {
      const activityLog = snapshot.val() || {};
      const combinedData = Object.values(activityLog);

      // Sort combined data by timestamp
      combinedData.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    // Listener for occupancy
    const unsubscribeOccupancy = onValue(occupancyRef, (snapshot) => {
      const data = snapshot.val();
      setOccupancy(data);
      setLastUpdated(new Date());
    });

    // Listener for average stay duration
    const unsubscribeAverageStay = onValue(averageStayRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.num_visits > 0) {
        const averageStayTime = data.total_time / data.num_visits;
        setAverageStay(Math.round(averageStayTime).toString()); // Round to the nearest minute
      } else {
        setAverageStay("0");
      }
    });

    // Listener for histogram data
    const unsubscribeHistogram = onValue(histogramRef, (snapshot) => {
      const data = snapshot.val() || [];
      const histogramDataArray = new Array(24).fill(0).map((_, hour) => {
        const hourData = data[hour] || {};
        return Math.round(hourData.currentStat || 0); // Round to the nearest whole number
      });

      const filteredHistogramData = histogramDataArray
        .map((count, hour) => {
          if (hour >= 6 && hour <= 24) {
            const period = hour >= 12 ? "PM" : "AM";
            const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
            return {
              time: `${formattedHour} ${period}`,
              count,
            };
          }
          return null;
        })
        .filter((entry) => entry !== null);

      setOccupancyData(filteredHistogramData); // Update histogram data
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeActivityLog();
      unsubscribeOccupancy();
      unsubscribeAverageStay();
      unsubscribeHistogram();
    };
  }, [selectedLocation, selectedDay]);

  const chartData = {
    labels: occupancyData.map((entry) => entry.time), // Assuming each entry has a 'time' field
    datasets: [
      {
        label: "Occupancy",
        data: occupancyData.map((entry) => entry.count), // Assuming each entry has a 'count' field
        backgroundColor: "rgba(13, 110, 253, 0.6)", // Bootstrap primary color with transparency
        borderColor: "rgba(13, 110, 253, 1)", // Bootstrap primary color
        borderWidth: 1,
        borderRadius: 5, // Rounded corners for bars
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Hour of the Day",
          font: {
            weight: 'bold',
            size: 14
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        title: {
          display: true,
          text: "Occupancy",
          font: {
            weight: 'bold',
            size: 14
          }
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#212529',
        bodyColor: '#212529',
        borderColor: '#dee2e6',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Occupancy: ${context.raw}`;
          }
        }
      }
    }
  };

  // Format the last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto py-4" 
                style={{
                  backgroundImage: 'url("/imgs/Screenshot 2025-04-18 044440.png")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'fixed',
                  backgroundRepeat: 'no-repeat',
                  position: 'relative',
                  transform: 'rotate(0deg)',
                  backgroundBlendMode: 'normal'
                }}>
      {/* Semi-transparent overlay to ensure text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 0
      }}></div>
      
      {/* Content container with higher z-index to appear above the overlay */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Banner with background image */}
        <div style={{
          position: 'relative',
          height: '180px',
          marginBottom: '30px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
          display: 'flex',
          backgroundColor: '#f8f9fa',
          backgroundImage: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 110, 253, 0.1) 100%)'
        }}>
          {/* Image container - left side */}
          <div style={{
            width: '180px',
            height: '100%',
            backgroundImage: 'url(/imgs/dashboard_background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0
          }}></div>
          
          {/* Content container - center and right */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
            position: 'relative'
          }}>
            {/* Logo container */}
            <div style={{
              marginRight: '30px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <img 
                src="/imgs/logo_transparent.png" 
                alt="Logo" 
                style={{
                  height: '100px',
                  width: 'auto',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
            </div>
            
            {/* Text container */}
            <div style={{
              flex: 1
            }}>
              <h1 className="h2 fw-bold mb-2 text-primary">Dashboard</h1>
              <p className="lead mb-0 text-muted">Monitor occupancy and activity statistics</p>
            </div>
          </div>
        </div>

        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill shadow-sm">
                  <i className="fas fa-sync-alt me-1"></i>
                  Last updated: {formatLastUpdated()}
                </Badge>
              </div>
            </div>
          </Col>
        </Row>

        <Row className="flex-grow-1">
          {/* Left Column */}
          <Col md={4} className="d-flex flex-column">
            <Card className="mb-4 flex-grow-1 border-0 shadow-sm hover-shadow" 
                  style={{ 
                    transition: 'all 0.3s ease',
                    background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
                    borderRadius: '12px'
                  }}>
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-medium">
                  <i className="fas fa-users text-primary me-2"></i>
                  Current Occupancy
                </h5>
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-center align-items-center p-4">
                <div className="d-flex justify-content-center align-items-center mb-4">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-4 d-flex align-items-center justify-content-center" 
                       style={{ 
                         width: '120px', 
                         height: '120px',
                         boxShadow: '0 0 20px rgba(13, 110, 253, 0.2)'
                       }}>
                    <i className="fas fa-users fa-3x text-primary"></i>
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="display-4 fw-bold text-primary mb-0">{occupancy}</h1>
                  <p className="text-muted mb-0">people currently</p>
                </div>
              </Card.Body>
            </Card>
            
            <Card className="mb-4 flex-grow-1 border-0 shadow-sm hover-shadow" 
                  style={{ 
                    transition: 'all 0.3s ease',
                    background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
                    borderRadius: '12px'
                  }}>
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-medium">
                  <i className="fas fa-clock text-primary me-2"></i>
                  Average Stay Duration
                </h5>
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-center align-items-center p-4">
                <div className="d-flex justify-content-center align-items-center mb-4">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-4 d-flex align-items-center justify-content-center" 
                       style={{ 
                         width: '120px', 
                         height: '120px',
                         boxShadow: '0 0 20px rgba(13, 110, 253, 0.2)'
                       }}>
                    <i className="fas fa-clock fa-3x text-primary"></i>
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="display-4 fw-bold text-primary mb-0">{averageStay}</h1>
                  <p className="text-muted mb-0">minutes average</p>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column */}
          <Col md={8} className="d-flex flex-column">
            <Card className="mb-4 flex-grow-1 border-0 shadow-sm hover-shadow" 
                  style={{ 
                    transition: 'all 0.3s ease',
                    background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
                    borderRadius: '12px'
                  }}>
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-medium">
                    <i className="fas fa-chart-bar text-primary me-2"></i>
                    Occupancy Histogram
                  </h5>
                  <Badge bg="primary" className="px-3 py-2 shadow-sm">
                    {selectedLocation} • {selectedDay}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="mb-4">
                  <Col md={6} className="mb-3 mb-md-0">
                    <Form.Group>
                      <Form.Label className="fw-medium text-muted">Location</Form.Label>
                      <Form.Select 
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="shadow-sm"
                        style={{ 
                          borderColor: '#dee2e6',
                          transition: 'all 0.3s ease',
                          borderRadius: '8px'
                        }}
                      >
                        <option value="UCF RWC">UCF RWC</option>
                        <option value="UCF Library">UCF Library</option>
                        <option value="UCF Arena">UCF Arena</option>
                        {/* Add more locations as needed */}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium text-muted">Day of Week</Form.Label>
                      <Form.Select 
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="shadow-sm"
                        style={{ 
                          borderColor: '#dee2e6',
                          transition: 'all 0.3s ease',
                          borderRadius: '8px'
                        }}
                      >
                        {daysOfWeek.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div style={{ height: '400px', position: 'relative' }}>
                  <Bar data={chartData} options={chartOptions} />
                  {occupancyData.length === 0 && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No data available for the selected criteria</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 fw-medium">Peak Hours</h6>
                      <p className="text-muted mb-0">
                        {occupancyData.length > 0 
                          ? occupancyData.reduce((max, item) => max.count > item.count ? max : item).time 
                          : 'No data available'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
}

export default Dashboard;
