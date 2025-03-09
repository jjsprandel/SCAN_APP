import React from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/Firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Container, Button, Card, Col, Row } from "react-bootstrap";

function Profile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/profile");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Row className="w-100">
        <Col md={{ span: 4, offset: 4 }}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Profile</h2>
              {currentUser ? (
                <>
                  <p className="text-center">
                    Signed in as: {currentUser.email}
                  </p>
                  <Button
                    variant="primary"
                    className="w-100 mt-3"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  className="w-100 mt-3"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Profile;
