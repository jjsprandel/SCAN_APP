import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form } from "react-bootstrap";
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

    const unsubscribeActivityLog = onValue(activityLogRef, (snapshot) => {
      const activityLog = snapshot.val() || {};
      const combinedData = Object.values(activityLog);

      // Sort combined data by timestamp
      combinedData.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      // Compute occupancy at each timestamp
      let currentOccupancy = 0;
      const occupancyTimeline = combinedData.map((entry) => {
        if (entry.action === "Check-In") {
          currentOccupancy += 1;
        } else if (entry.action === "Check-Out") {
          currentOccupancy -= 1;
        }
        return { time: entry.timestamp, count: currentOccupancy };
      });

      // Aggregate data into hourly intervals
      const hourlyOccupancy = new Array(24).fill(0);
      occupancyTimeline.forEach((entry) => {
        const hour = parseInt(entry.time.substring(9, 11), 10); // Extract hour from timestamp
        hourlyOccupancy[hour] += entry.count;
      });

      // Filter data to only include times between 6 AM and 12 PM
      const filteredOccupancyDataArray = hourlyOccupancy
        .map((count, hour) => {
          if (hour >= 6 && hour <= 12) {
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

      setOccupancyData(filteredOccupancyDataArray);
    });

    const unsubscribeOccupancy = onValue(occupancyRef, (snapshot) => {
      const data = snapshot.val();
      setOccupancy(data);
    });

    const unsubscribeAverageStay = onValue(averageStayRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.num_visits > 0) {
        const averageStayTime = data.total_time / data.num_visits;
        setAverageStay(averageStayTime.toFixed(2)); // Convert seconds to hours and format to 2 decimal places
      } else {
        setAverageStay("0");
      }
    });

    const unsubscribeHistogram = onValue(histogramRef, (snapshot) => {
      const data = snapshot.val() || [];
      const histogramDataArray = new Array(24).fill(0).map((_, hour) => {
        const hourData = data[hour] || {};
        return hourData.currentStat || 0;
      });

      // Filter data to only include times between 6 AM and 12 PM
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

      setOccupancyData(filteredHistogramData);
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
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: "Hour of the Day",
        },
      },
      y: {
        title: {
          display: true,
          text: "Occupancy",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto">
      <Row className="flex-grow-1 mt-4">
        {/* Left Column */}
        <Col md={4} className="d-flex flex-column">
          <Card className="mb-3 flex-grow-1">
            <Card.Header>Occupancy</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <Row className="w-100 d-flex justify-content-center align-items-center">
                <Col
                  md={6}
                  className="d-flex justify-content-center align-items-center"
                >
                  <img
                    src="/imgs/speed.png"
                    alt="Description"
                    className="img-fluid"
                  />
                </Col>
              </Row>
              <Row className="w-100 d-flex justify-content-center align-items-center">
                <Col
                  md={6}
                  className="d-flex justify-content-center align-items-center"
                >
                  <p>{occupancy}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          <Card className="mb-3 flex-grow-1">
            <Card.Header>Average Stay Duration</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <Row className="w-100 d-flex justify-content-center align-items-center">
                <Col
                  md={6}
                  className="d-flex justify-content-center align-items-center"
                >
                  <img
                    src="/imgs/clock.png"
                    alt="Description"
                    className="img-fluid"
                  />
                </Col>
              </Row>
              <Row className="w-100 d-flex justify-content-center align-items-center">
                <Col className="d-flex justify-content-center align-items-center">
                  <p>{averageStay} minutes</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col md={8} className="d-flex flex-column">
          <Card className="mb-3 flex-grow-1">
            <Card.Header>Occupancy Histogram</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <Row className="w-100 d-flex justify-content-center align-items-center">
                <Col
                  md={2}
                  className="d-flex justify-content-center align-items-center"
                >
                  <Form.Label>Location:</Form.Label>
                </Col>
                <Col
                  md={3}
                  className="d-flex justify-content-center align-items-center"
                >
                  <Form.Control
                    as="select"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <option value="UCF RWC">UCF RWC</option>
                    <option value="UCF Library">UCF Library</option>
                    <option value="UCF Arena">UCF Arena</option>
                    {/* Add more locations as needed */}
                  </Form.Control>
                </Col>
                <Col
                  md={2}
                  className="d-flex justify-content-center align-items-center"
                >
                  <Form.Label>Week Day:</Form.Label>
                </Col>
                <Col
                  md={3}
                  className="d-flex justify-content-center align-items-center"
                >
                  <Form.Control
                    as="select"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </Form.Control>
                </Col>
                <Col md={2}></Col>
              </Row>
              <Bar data={chartData} options={chartOptions} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
