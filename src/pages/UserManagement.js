import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Card,
  Button,
  Badge,
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

  useEffect(() => {
    if (profileData) {
      const updatedProfile = users.find((user) => user.userId === profileData.userId);
      if (updatedProfile) {
        setProfileData(updatedProfile);
        setEditedProfileData(updatedProfile);
      }
    }
  }, [users, profileData]);

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
      activeUser: editedProfileData.activeUser,
      role: editedProfileData.role,
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
      activeUser: "No",
      totalOccupancyTime: "",
      averageStayDuration: "",
      role: "Student",
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
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto py-4">
      {/* Header Section */}
      <div className="mb-4">
        <h2 className="fw-bold text-primary mb-1">
          <i className="fas fa-users me-2"></i>
          User Management
        </h2>
        <p className="text-muted mb-0">Manage user profiles and permissions</p>
      </div>

      {/* Search Section */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body className="p-3">
          <Row className="align-items-center">
            <Col md={6} className="mb-3 mb-md-0">
              <Form.Group className="mb-0">
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Search users..."
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
              <Button
                variant="primary"
                onClick={handleAddUserClick}
                className="px-3 py-2"
                style={{ borderRadius: '8px' }}
              >
                <i className="fas fa-user-plus me-2"></i>
                Add New User
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="flex-grow-1">
        <Col md={6} className="order-2 order-md-1 mb-4 mb-md-0">
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <h5 className="mb-0 fw-medium">
                <i className="fas fa-list text-primary me-2"></i>
                User List
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-3 py-3">User ID</th>
                      <th className="px-3 py-3">First Name</th>
                      <th className="px-3 py-3">Last Name</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((item, index) => (
                      <tr
                        key={index}
                        onClick={() => handleRowClick(item)}
                        style={{ cursor: "pointer" }}
                        className={profileData && profileData.userId === item.userId ? "table-active" : ""}
                      >
                        <td className="px-3 py-3">
                          <span className="fw-medium">{item.userId}</span>
                        </td>
                        <td className="px-3 py-3">{item.firstName || "N/A"}</td>
                        <td className="px-3 py-3">{item.lastName || "N/A"}</td>
                        <td className="px-3 py-3">
                          <Badge 
                            bg={item.checkInStatus === "Checked In" ? "success" : "secondary"} 
                            className="px-2 py-1"
                          >
                            {item.checkInStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-5">
                          <i className="fas fa-search fa-3x text-muted mb-3"></i>
                          <p className="text-muted">No users found matching your search criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="order-1 order-md-2">
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-bottom py-3">
              <h5 className="mb-0 fw-medium">
                <i className="fas fa-user-circle text-primary me-2"></i>
                User Profile
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {profileData || isEditMode ? (
                <>
                  <div className="text-center mb-4">
                    <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ 
                           width: '80px', 
                           height: '80px',
                           boxShadow: '0 0 15px rgba(13, 110, 253, 0.2)'
                         }}>
                      <img
                        src="/imgs/user.png"
                        alt="User"
                        style={{ width: '50px', height: 'auto' }}
                      />
                    </div>
                    <h5 className="fw-bold mb-0">
                      {isEditMode && !profileData ? "New User" : 
                       `${profileData?.firstName || ''} ${profileData?.lastName || ''}`}
                    </h5>
                    <p className="text-muted mb-0">
                      {isEditMode && !profileData ? "Create a new user profile" : 
                       profileData?.role || "User"}
                    </p>
                  </div>

                  {profileData ? (
                    <div className="mb-3">
                      <label className="form-label text-muted small mb-1">User ID</label>
                      <div className="p-2 bg-light rounded">
                        <span className="fw-medium">{profileData?.userId || "N/A"}</span>
                      </div>
                    </div>
                  ) : (
                    <Form.Group className="mb-3">
                      <Form.Label className="text-muted small mb-1">User ID</Form.Label>
                      <Form.Control
                        type="text"
                        name="userId"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        className="shadow-sm"
                        style={{ borderRadius: '8px' }}
                      />
                    </Form.Group>
                  )}

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">First Name</Form.Label>
                        {isEditMode ? (
                          <Form.Control
                            type="text"
                            name="firstName"
                            value={editedProfileData.firstName || ""}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          />
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <span>{profileData.firstName || "N/A"}</span>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">Last Name</Form.Label>
                        {isEditMode ? (
                          <Form.Control
                            type="text"
                            name="lastName"
                            value={editedProfileData.lastName || ""}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          />
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <span>{profileData.lastName || "N/A"}</span>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">Check-In Status</Form.Label>
                        {isEditMode ? (
                          <Form.Select
                            name="checkInStatus"
                            value={editedProfileData.checkInStatus}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          >
                            <option value="Checked In">Checked In</option>
                            <option value="Checked Out">Checked Out</option>
                          </Form.Select>
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <Badge 
                              bg={profileData.checkInStatus === "Checked In" ? "success" : "secondary"} 
                              className="px-2 py-1"
                            >
                              {profileData.checkInStatus}
                            </Badge>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">Active User</Form.Label>
                        {isEditMode ? (
                          <Form.Select
                            name="activeUser"
                            value={editedProfileData.activeUser}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </Form.Select>
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <Badge 
                              bg={profileData.activeUser === "Yes" ? "success" : "secondary"} 
                              className="px-2 py-1"
                            >
                              {profileData.activeUser}
                            </Badge>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small mb-1">Role</Form.Label>
                    {isEditMode ? (
                      <Form.Select
                        name="role"
                        value={editedProfileData.role || ""}
                        onChange={handleInputChange}
                        className="shadow-sm"
                        style={{ borderRadius: '8px' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Student">Student</option>
                      </Form.Select>
                    ) : (
                      <div className="p-2 bg-light rounded">
                        <Badge 
                          bg={profileData.role === "Admin" ? "danger" : "primary"} 
                          className="px-2 py-1"
                        >
                          {profileData.role || "N/A"}
                        </Badge>
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small mb-1">Location</Form.Label>
                    {isEditMode ? (
                      <Form.Select
                        name="location"
                        value={editedProfileData.location || ""}
                        onChange={handleInputChange}
                        className="shadow-sm"
                        style={{ borderRadius: '8px' }}
                      >
                        <option value="UCF RWC">UCF RWC</option>
                        <option value="UCF Arena">UCF Arena</option>
                        <option value="UCF Library">UCF Library</option>
                      </Form.Select>
                    ) : (
                      <div className="p-2 bg-light rounded">
                        <span className="badge bg-light text-dark">
                          {profileData.location || "N/A"}
                        </span>
                      </div>
                    )}
                  </Form.Group>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">Total Occupancy Time</Form.Label>
                        {isEditMode ? (
                          <Form.Control
                            type="text"
                            name="totalOccupancyTime"
                            value={editedProfileData.totalOccupancyTime || ""}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          />
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <span>{profileData.totalOccupancyTime || "N/A"}</span>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-muted small mb-1">Average Stay Duration</Form.Label>
                        {isEditMode ? (
                          <Form.Control
                            type="text"
                            name="averageStayDuration"
                            value={editedProfileData.averageStayDuration || ""}
                            onChange={handleInputChange}
                            className="shadow-sm"
                            style={{ borderRadius: '8px' }}
                          />
                        ) : (
                          <div className="p-2 bg-light rounded">
                            <span>{profileData.averageStayDuration || "N/A"}</span>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-center mt-4">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="success"
                          onClick={handleSaveClick}
                          className="me-2 px-4"
                          style={{ borderRadius: '8px' }}
                        >
                          <i className="fas fa-save me-2"></i> Save
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={handleCancelClick}
                          className="px-4"
                          style={{ borderRadius: '8px' }}
                        >
                          <i className="fas fa-times me-2"></i> Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleEditClick}
                        className="me-2 px-4"
                        style={{ borderRadius: '8px' }}
                      >
                        <i className="fas fa-edit me-2"></i> Edit
                      </Button>
                    )}
                    {profileData && !isEditMode && (
                      <Button
                        variant="outline-danger"
                        onClick={handleDeleteClick}
                        className="px-4"
                        style={{ borderRadius: '8px' }}
                      >
                        <i className="fas fa-trash-alt me-2"></i> Delete
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-user-circle fa-4x text-muted mb-3"></i>
                  <p className="text-muted">
                    Select a user to view their profile or click "Add New User" to
                    create a new profile.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default UserManagement;
