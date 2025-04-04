import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database, storage } from "../services/Firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import mqtt from "mqtt";
import { useDropzone } from "react-dropzone";

function KioskManagement() {
  const [kiosks, setKiosks] = useState([]);
  const [selectedKiosks, setSelectedKiosks] = useState([]);
  const [releaseVersions, setReleaseVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [updateMethod, setUpdateMethod] = useState("github");
  const [customFirmware, setCustomFirmware] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.name.endsWith('.bin')) {
      setCustomFirmware(file);
      setError(null);
    } else {
      setError('Please select a valid .bin file');
      setCustomFirmware(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.bin']
    },
    maxFiles: 1
  });

  const handleUpdateFirmware = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setSuccess(null);

      let firmwareUrl;
      if (updateMethod === "github") {
        firmwareUrl = `https://github.com/jjsprandel/SCAN/releases/download/${selectedVersion.value}/SCAN.bin`;
        setUploadProgress(50); // GitHub URL is instant
      } else if (updateMethod === "custom") {
        if (!customFirmware) {
          throw new Error("Please select a firmware file");
        }

        // Upload to Firebase Storage
        const fileRef = storageRef(storage, `firmware/${Date.now()}-${customFirmware.name}`);
        await uploadBytes(fileRef, customFirmware);
        setUploadProgress(50); // File upload complete
        firmwareUrl = await getDownloadURL(fileRef);
        setUploadProgress(75); // URL retrieved
      }

      if (!firmwareUrl) {
        throw new Error("No firmware URL available");
      }

      const client = mqtt.connect(
        "wss://0ec065087cf84d309f1c73b00c9441f8.s1.eu.hivemq.cloud:8884/mqtt",
        {
          username: "admin",
          password: "Password1234",
        }
      );

      client.on("connect", () => {
        console.log("MQTT client connected");
        setUploadProgress(90); // MQTT connected

        let messagesSent = 0;
        selectedKiosks.forEach((kiosk) => {
          const topic = `kiosks/${kiosk.value}/update`;
          const message = JSON.stringify({
            firmware_version: updateMethod === "github" ? selectedVersion.value : "custom",
            download_url: firmwareUrl,
          }).replace(/"/g, ''); // Removes all double quotes
          
          console.log(`Publishing to topic ${topic}:`, message);

          client.publish(topic, message, (err) => {
            if (err) {
              console.error(`Failed to publish message to ${topic}:`, err);
            } else {
              console.log(`Message published to ${topic}:`, message);
              messagesSent++;
              if (messagesSent === selectedKiosks.length) {
                setUploadProgress(100);
                setSuccess({
                  message: `Firmware update initiated for ${selectedKiosks.length} kiosk${selectedKiosks.length > 1 ? 's' : ''}`,
                  url: firmwareUrl,
                  fileName: updateMethod === "github" ? "SCAN.bin" : customFirmware.name
                });
                setTimeout(() => {
                  setIsUploading(false);
                  setUploadProgress(0);
                }, 500);
              }
            }
          });
        });

        client.end();
      });

      client.on("error", (err) => {
        console.error("MQTT client error:", err);
        setError("Failed to connect to MQTT server");
        setIsUploading(false);
        setUploadProgress(0);
      });
    } catch (error) {
      console.error("Failed to update firmware:", error);
      setError(error.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
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
                <Form.Group controlId="updateMethod" className="mb-4">
                  <Form.Label className="mb-3">Update Method</Form.Label>
                  <div className="d-flex gap-3">
                    <Button
                      variant={updateMethod === "github" ? "primary" : "outline-primary"}
                      className="flex-grow-1 py-3"
                      onClick={() => {
                        setUpdateMethod("github");
                        setSelectedVersion(null);
                        setCustomFirmware(null);
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      <i className="fab fa-github me-2"></i>
                      GitHub Release
                    </Button>
                    <Button
                      variant={updateMethod === "custom" ? "primary" : "outline-primary"}
                      className="flex-grow-1 py-3"
                      onClick={() => {
                        setUpdateMethod("custom");
                        setSelectedVersion(null);
                        setCustomFirmware(null);
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      <i className="fas fa-upload me-2"></i>
                      Custom Upload
                    </Button>
                  </div>
                </Form.Group>

                <Form.Group controlId="selectKiosks" className="mb-4">
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

                {updateMethod === "github" ? (
                  <Form.Group controlId="selectVersion" className="mb-4">
                    <Form.Label>Select Release Version</Form.Label>
                    <Select
                      options={releaseVersions}
                      value={selectedVersion}
                      onChange={setSelectedVersion}
                    />
                  </Form.Group>
                ) : (
                  <Form.Group controlId="customFirmware" className="mb-4">
                    <Form.Label>Upload Firmware File</Form.Label>
                    <div
                      {...getRootProps()}
                      className={`p-4 border rounded text-center ${
                        isDragActive ? "border-primary bg-light" : "border-dashed"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {customFirmware ? (
                        <div>
                          <i className="fas fa-file-alt fa-2x mb-2 text-primary"></i>
                          <p className="mb-0">Selected file: {customFirmware.name}</p>
                        </div>
                      ) : (
                        <div>
                          <i className="fas fa-cloud-upload-alt fa-2x mb-2 text-muted"></i>
                          <p className="mb-0">
                            {isDragActive
                              ? "Drop the firmware file here"
                              : "Drag and drop a .bin file here, or click to select"}
                          </p>
                        </div>
                      )}
                    </div>
                  </Form.Group>
                )}

                {error && (
                  <Alert variant="danger" className="mt-3">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert variant="success" className="mt-3">
                    <div className="d-flex flex-column align-items-center">
                      <i className="fas fa-check-circle fa-2x mb-2 text-success"></i>
                      <p className="mb-2">{success.message}</p>
                      <Button
                        variant="outline-primary"
                        href={success.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-100 text-center"
                      >
                        <i className="fas fa-download me-2"></i>
                        Download {success.fileName}
                      </Button>
                    </div>
                  </Alert>
                )}

                {isUploading && (
                  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 1000 }}>
                    <div className="text-center">
                      <div className="position-relative mb-3">
                        <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="position-absolute top-50 start-50 translate-middle">
                          <div className="progress" style={{ width: '3rem', height: '3rem', borderRadius: '50%' }}>
                            <div 
                              className="progress-bar progress-bar-striped progress-bar-animated" 
                              role="progressbar" 
                              style={{ width: `${uploadProgress}%` }}
                              aria-valuenow={uploadProgress} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-primary mb-0">
                        {uploadProgress < 50 ? "Uploading firmware..." :
                         uploadProgress < 75 ? "Processing..." :
                         uploadProgress < 90 ? "Connecting to devices..." :
                         "Sending update..."}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="mt-4 w-100 py-3"
                  onClick={handleUpdateFirmware}
                  disabled={
                    selectedKiosks.length === 0 ||
                    (updateMethod === "github" && !selectedVersion) ||
                    (updateMethod === "custom" && !customFirmware) ||
                    isUploading
                  }
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt me-2"></i>
                      Update Firmware
                    </>
                  )}
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
