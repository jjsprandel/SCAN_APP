import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../services/Firebase"; // Adjust the import path as necessary
import Select from "react-select";
import mqtt from "mqtt";

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
            value: key,
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
    console.log("Update Firmware button clicked");
    console.log("Selected Kiosks:", selectedKiosks);
    console.log("Selected Version:", selectedVersion);

    const client = mqtt.connect(
      "wss://0ec065087cf84d309f1c73b00c9441f8.s1.eu.hivemq.cloud:8884/mqtt",
      {
        username: "admin",
        password: "Password1234",
      }
    );

    client.on("connect", () => {
      console.log("MQTT client connected");

      selectedKiosks.forEach((kiosk) => {
        const topic = `kiosks/${kiosk.value}/update`;
        const message = JSON.stringify({
          firmware_version: selectedVersion.value,
          download_url: `https://github.com/jjsprandel/SCAN/releases/download/${selectedVersion.value}/SCAN.bin`,
        });

        console.log(`Publishing to topic ${topic}:`, message);

        client.publish(topic, message, (err) => {
          if (err) {
            console.error(`Failed to publish message to ${topic}:`, err);
          } else {
            console.log(`Message published to ${topic}:`, message);
          }
        });
      });

      client.end();
    });

    client.on("error", (err) => {
      console.error("MQTT client error:", err);
    });
  };

  const handleSelectAllKiosks = () => {
    if (selectedKiosks.length === kiosks.length) {
      setSelectedKiosks([]);
    } else {
      setSelectedKiosks(kiosks);
    }
  };

  const customSelectAllOption = {
    value: "select_all",
    label:
      selectedKiosks.length === kiosks.length ? "Deselect All" : "Select All",
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
                    options={[customSelectAllOption, ...kiosks]}
                    value={selectedKiosks}
                    onChange={(selectedOptions) => {
                      if (
                        selectedOptions.some(
                          (option) => option.value === "select_all"
                        )
                      ) {
                        handleSelectAllKiosks();
                      } else {
                        setSelectedKiosks(selectedOptions);
                      }
                    }}
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
