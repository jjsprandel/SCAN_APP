import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../services/Firebase"; // Adjust the import path as necessary
import Select from "react-select";

function KioskManagement() {
  const [kiosks, setKiosks] = useState([]);
  const [selectedKiosks, setSelectedKiosks] = useState([]);
  const [releaseVersions, setReleaseVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    // Fetch kiosks from the database
    const kiosksRef = ref(database, "kiosks");
    onValue(kiosksRef, (snapshot) => {
      const data = snapshot.val();
      const kiosksArray = data
        ? Object.keys(data).map((key) => ({
            value: data[key].id,
            label: data[key].name,
          }))
        : [];
      setKiosks(kiosksArray);
    });

    // Fetch release versions from GitHub
    fetch("https://api.github.com/repos/jjsprandel/SCAN/releases")
      .then((response) => response.json())
      .then((data) => {
        const releasesArray = data.map((release) => ({
          value: release.tag_name,
          label: release.tag_name,
        }));
        setReleaseVersions(releasesArray);
      })
      .catch((error) => console.error("Error fetching releases:", error));
  }, []);

  const handleUpdateFirmware = () => {
    // Implement firmware update logic here
    console.log(
      `Updating kiosks ${selectedKiosks
        .map((kiosk) => kiosk.value)
        .join(", ")} to version ${selectedVersion.value}`
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
                <Form.Group controlId="selectKiosks">
                  <Form.Label>Select Kiosks</Form.Label>
                  <Select
                    isMulti
                    options={kiosks}
                    value={selectedKiosks}
                    onChange={setSelectedKiosks}
                  />
                </Form.Group>
                <Form.Group controlId="selectVersion" className="mt-3">
                  <Form.Label>Select Release Version</Form.Label>
                  <Select
                    options={releaseVersions}
                    value={selectedVersion}
                    onChange={setSelectedVersion}
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={handleUpdateFirmware}
                  disabled={selectedKiosks.length === 0 || !selectedVersion}
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
