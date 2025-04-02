import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Table, Button } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../services/Firebase"; // Adjust the import path as necessary

function ActivityLog() {
  const [activityLog, setActivityLog] = useState([]);
  const [users, setUsers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const rowsPerPage = 20;

  useEffect(() => {
    const activityLogRef = ref(database, "activityLog");
    const usersRef = ref(database, "users");

    const unsubscribeActivityLog = onValue(activityLogRef, (snapshot) => {
      const data = snapshot.val();
      const activityLogArray = data
        ? Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }))
        : [];

      // Reverse the activity log array to display newer events at the top
      activityLogArray.reverse();

      setActivityLog(activityLogArray);
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      setUsers(data || {});
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeActivityLog();
      unsubscribeUsers();
    };
  }, []);

  const formatTimestamp = (timestamp) => {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    const second = timestamp.substring(13, 15);

    const date = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`
    );
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to the first page on new search
  };

  // Filter the activity log based on the search query
  const filteredActivityLog = activityLog.filter((entry) => {
    const user = users[entry.userId] || {};
    const fullName = `${user.firstName || ""} ${
      user.lastName || ""
    }`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      entry.userId.includes(query) ||
      fullName.includes(query) ||
      entry.action.toLowerCase().includes(query) ||
      entry.location.toLowerCase().includes(query) ||
      formatTimestamp(entry.timestamp).toLowerCase().includes(query)
    );
  });

  // Calculate the rows to display based on the current page
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredActivityLog.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  return (
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto">
      {/* Row for the search bar */}
      <Row className="mt-4">
        <Col md={3}>
          <Form>
            <Form.Group controlId="search">
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </Form.Group>
          </Form>
        </Col>
      </Row>

      {/* Row for the table */}
      <Row className="flex-grow-1 mt-4">
        <Col>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>User ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Action</th>
                <th>Time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((item, index) => {
                const user = users[item.userId] || {};
                return (
                  <tr key={index}>
                    <td>{item.userId}</td>
                    <td>{user.firstName || "N/A"}</td>
                    <td>{user.lastName || "N/A"}</td>
                    <td>{item.action}</td>
                    <td>{formatTimestamp(item.timestamp)}</td>
                    <td>{item.location}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="d-flex justify-content-between">
            <Button
              variant="secondary"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={handleNextPage}
              disabled={indexOfLastRow >= filteredActivityLog.length}
            >
              Next
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default ActivityLog;
