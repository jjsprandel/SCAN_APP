import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../services/Firebase"; // Adjust the import path as necessary

function KioskManagement() {
  const [kiosks, setKiosks] = useState([]);
  const [selectedKiosk, setSelectedKiosk] = useState("");
  const [releaseVersions, setReleaseVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("");

  useEffect(() => {
    // Fetch kiosks from the database
    const kiosksRef = ref(database, "kiosks");
    onValue(kiosksRef, (snapshot) => {
      const data = snapshot.val();
      const kiosksArray = data ? Object.keys(data).map((key) => data[key]) : [];
      setKiosks(kiosksArray);
    });

    // Fetch release versions from GitHub
    fetch("https://api.github.com/repos/jjsprandel/SCAN/releases")
      .then((response) => response.json())
      .then((data) => {
        const releasesArray = data.map((release) => release.tag_name);
        setReleaseVersions(releasesArray);
      })
      .catch((error) => console.error("Error fetching releases:", error));
  }, []);

  const handleUpdateFirmware = () => {
    // Implement firmware update logic here
    console.log(
      `Updating kiosk ${selectedKiosk} to version ${selectedVersion}`
    );
  };

  return (
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto">
      <Row className="mt-4">
        <Col md={4} className="offset-md-4">
          <Card>
            <Card.Body>
              <h3 className="mb-4">Update Firmware</h3>
              <Form>
                <Form.Group controlId="selectKiosk">
                  <Form.Label>Select Kiosk</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedKiosk}
                    onChange={(e) => setSelectedKiosk(e.target.value)}
                  >
                    {kiosks.map((kiosk, index) => (
                      <option key={index} value={kiosk.id}>
                        {kiosk.name}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
                <Form.Group controlId="selectVersion" className="mt-3">
                  <Form.Label>Select Release Version</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                  >
                    {releaseVersions.map((version, index) => (
                      <option key={index} value={version}>
                        {version}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={handleUpdateFirmware}
                  disabled={!selectedKiosk || !selectedVersion}
                >
                  Update Firmware
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default KioskManagement;
