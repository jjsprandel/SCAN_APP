import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Card,
  Button,
} from "react-bootstrap";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from "../services/Firebase"; // Adjust the import path as necessary

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState({});
  const [newUserId, setNewUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const usersRef = ref(database, "users");

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const usersArray = data
        ? Object.keys(data).map((key) => ({
            userId: key,
            ...data[key],
          }))
        : [];
      setUsers(usersArray);
    });

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const handleRowClick = (user) => {
    setProfileData(user);
    setEditedProfileData(user);
    setIsEditMode(false);
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSaveClick = () => {
    const updatedProfileData = {
      ...editedProfileData,
      checkInStatus: editedProfileData.checkInStatus,
      activeStudent: editedProfileData.activeStudent,
    };
    delete updatedProfileData.userId; // Ensure userId is not included in the user data

    if (profileData) {
      // Update existing user
      const userRef = ref(database, `users/${profileData.userId}`);
      set(userRef, updatedProfileData)
        .then(() => {
          // Update the local state after successful save
          setProfileData(null);
          setEditedProfileData({});
          setIsEditMode(false);
        })
        .catch((error) => {
          console.error("Error updating profile data: ", error);
        });
    } else {
      // Add new user
      const userRef = ref(database, `users/${newUserId}`);
      set(userRef, updatedProfileData)
        .then(() => {
          setProfileData(null);
          setEditedProfileData({});
          setIsEditMode(false);
        })
        .catch((error) => {
          console.error("Error adding new user: ", error);
        });
    }
  };

  const handleDeleteClick = () => {
    const userRef = ref(database, `users/${profileData.userId}`);
    remove(userRef)
      .then(() => {
        // Remove the user from the local state
        setUsers((prevUsers) =>
          prevUsers.filter((user) => user.userId !== profileData.userId)
        );
        setProfileData(null);
        setEditedProfileData({});
        setIsEditMode(false);
      })
      .catch((error) => {
        console.error("Error deleting user: ", error);
      });
  };

  const handleAddUserClick = () => {
    setProfileData(null);
    setEditedProfileData({
      firstName: "",
      lastName: "",
      location: "",
      checkInStatus: "Checked Out",
      activeStudent: "No",
      totalOccupancyTime: "",
      averageStayDuration: "",
    });
    setNewUserId("");
    setIsEditMode(true);
  };

  const handleCancelClick = () => {
    setProfileData(null);
    setEditedProfileData({});
    setIsEditMode(false);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter the users based on the search query
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName || ""} ${
      user.lastName || ""
    }`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      user.userId.includes(query) ||
      fullName.includes(query) ||
      user.checkInStatus.toLowerCase().includes(query) ||
      user.location.toLowerCase().includes(query)
    );
  });

  return (
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto">
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

      <Row className="flex-grow-1 mt-4">
        <Col md={6} className="order-2 order-md-1">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>User ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Check-In Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item, index) => (
                <tr
                  key={index}
                  onClick={() => handleRowClick(item)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{item.userId}</td>
                  <td>{item.firstName || "N/A"}</td>
                  <td>{item.lastName || "N/A"}</td>
                  <td>{item.checkInStatus}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>

        <Col md={6} className="order-1 order-md-2">
          <Card className="mb-3 flex-grow-1">
            <Card.Header>Profile</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              {profileData || isEditMode ? (
                <>
                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={2}
                      className="d-flex justify-content-center align-items-center"
                    >
                      <img
                        src="/imgs/user.png"
                        alt="Description"
                        className="img-fluid"
                      />
                    </Col>
                  </Row>

                  {!profileData && (
                    <Row className="w-100 d-flex justify-content-center align-items-center">
                      <Col
                        md={6}
                        className="d-flex justify-content-left align-items-left"
                      >
                        <p>User ID:</p>
                      </Col>
                      <Col
                        md={6}
                        className="d-flex justify-content-left align-items-left"
                      >
                        <Form.Control
                          type="text"
                          name="userId"
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                        />
                      </Col>
                    </Row>
                  )}

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>First Name:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={editedProfileData.firstName || ""}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <p>{profileData.firstName || "N/A"}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Last Name:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={editedProfileData.lastName || ""}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <p>{profileData.lastName || "N/A"}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Check-In Status:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          as="select"
                          name="checkInStatus"
                          value={editedProfileData.checkInStatus}
                          onChange={handleInputChange}
                        >
                          <option value="Checked In">Checked In</option>
                          <option value="Checked Out">Checked Out</option>
                        </Form.Control>
                      ) : (
                        <p>{profileData.checkInStatus}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Active Student:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          as="select"
                          name="activeStudent"
                          value={editedProfileData.activeStudent}
                          onChange={handleInputChange}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </Form.Control>
                      ) : (
                        <p>{profileData.activeStudent}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Location:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          type="text"
                          name="location"
                          value={editedProfileData.location || ""}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <p>{profileData.location || "N/A"}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Total Occupancy Time:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          type="text"
                          name="totalOccupancyTime"
                          value={editedProfileData.totalOccupancyTime || ""}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <p>{profileData.totalOccupancyTime || "N/A"}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      <p>Average Stay Duration:</p>
                    </Col>
                    <Col
                      md={6}
                      className="d-flex justify-content-left align-items-left"
                    >
                      {isEditMode ? (
                        <Form.Control
                          type="text"
                          name="averageStayDuration"
                          value={editedProfileData.averageStayDuration || ""}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <p>{profileData.averageStayDuration || "N/A"}</p>
                      )}
                    </Col>
                  </Row>

                  <Row className="w-100 d-flex justify-content-center align-items-center">
                    <Col
                      md={6}
                      className="d-flex justify-content-center align-items-center"
                    >
                      {isEditMode ? (
                        <>
                          <Button
                            className="btn btn-success mx-2"
                            onClick={handleSaveClick}
                          >
                            Save
                          </Button>
                          <Button
                            className="btn btn-secondary mx-2"
                            onClick={handleCancelClick}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="btn btn-primary mx-2"
                          onClick={handleEditClick}
                        >
                          Edit
                        </Button>
                      )}
                      {profileData && (
                        <Button
                          className="btn btn-danger mx-2"
                          onClick={handleDeleteClick}
                        >
                          Delete
                        </Button>
                      )}
                    </Col>
                  </Row>
                </>
              ) : (
                <p>
                  Select a user to view their profile or click "Add New User" to
                  create a new profile.
                </p>
              )}
            </Card.Body>
          </Card>
          <Row className="w-100 d-flex justify-content-center align-items-center pb-3">
            <Col
              md={6}
              className="d-flex justify-content-center align-items-center"
            >
              <Button
                className="btn btn-primary mt-3"
                onClick={handleAddUserClick}
              >
                Add New User
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default UserManagement;
