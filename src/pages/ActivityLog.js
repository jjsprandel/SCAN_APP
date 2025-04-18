import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Table, Button, Card, Badge } from "react-bootstrap";
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
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto py-4">
      {/* Header Section */}
      <div className="mb-4">
        <h2 className="fw-bold text-primary mb-1">
          <i className="fas fa-history me-2"></i>
          Activity Log
        </h2>
        <p className="text-muted mb-0">Track all user activities and system events</p>
      </div>

      {/* Search and Filter Section */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body className="p-3">
          <Row className="align-items-center">
            <Col md={6} className="mb-3 mb-md-0">
              <Form.Group className="mb-0">
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={{ 
                      borderRadius: '8px',
                      borderColor: '#dee2e6',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      paddingLeft: '45px'
                    }}
                  />
                  <i className="fas fa-search position-absolute" 
                     style={{ 
                       top: '50%', 
                       left: '15px', 
                       transform: 'translateY(-50%)',
                       color: '#6c757d',
                       zIndex: 1,
                       pointerEvents: 'none'
                     }}></i>
                </div>
              </Form.Group>
            </Col>
            <Col md={6} className="text-md-end">
              <Badge bg="light" text="dark" className="px-3 py-2 rounded-pill shadow-sm">
                <i className="fas fa-filter me-1"></i>
                Showing {currentRows.length} of {filteredActivityLog.length} activities
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table Section */}
      <Card className="flex-grow-1 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-3 py-3">User ID</th>
                  <th className="px-3 py-3">First Name</th>
                  <th className="px-3 py-3">Last Name</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((item, index) => {
                  const user = users[item.userId] || {};
                  return (
                    <tr key={index} className="align-middle">
                      <td className="px-3 py-3">
                        <span className="fw-medium">{item.userId}</span>
                      </td>
                      <td className="px-3 py-3">{user.firstName || "N/A"}</td>
                      <td className="px-3 py-3">{user.lastName || "N/A"}</td>
                      <td className="px-3 py-3">
                        <Badge 
                          bg={item.action.includes("Check In") ? "success" : 
                              item.action.includes("Check Out") ? "danger" : 
                              "primary"} 
                          className="px-2 py-1"
                        >
                          {item.action}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-muted">{formatTimestamp(item.timestamp)}</td>
                      <td className="px-3 py-3">
                        <span className="badge bg-light text-dark">
                          {item.location}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <i className="fas fa-search fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No activities found matching your search criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        <Card.Footer className="bg-white border-top py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted">
                Page {currentPage} of {Math.ceil(filteredActivityLog.length / rowsPerPage) || 1}
              </span>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="me-2"
                style={{ borderRadius: '6px' }}
              >
                <i className="fas fa-chevron-left me-1"></i> Previous
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleNextPage}
                disabled={indexOfLastRow >= filteredActivityLog.length}
                style={{ borderRadius: '6px' }}
              >
                Next <i className="fas fa-chevron-right ms-1"></i>
              </Button>
            </div>
          </div>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default ActivityLog;
