import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database, storage } from "../services/Firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import mqtt from "mqtt";
import { useDropzone } from "react-dropzone";

// Create a single message handler function outside the component
const createMessageHandler = (client, setMqttLogs, mqttLogsRef, setPingResponses, pingTimeoutsRef) => {
  return (topic, message) => {
    console.log("Message handler triggered for topic:", topic);
    
    // Handle ping responses
    if (topic.endsWith('/ping')) {
      const macAddress = topic.split("/")[1];
      const messageText = message.toString();
      console.log(`Received ping response from ${macAddress}:`, messageText);
      
      if (messageText === "ping") {
        console.log(`Setting ping response to true for ${macAddress}`);
        // Only update the response for this specific kiosk
        setPingResponses(prev => {
          const newResponses = {
            ...prev,
            [macAddress]: true
          };
          console.log('New ping responses:', newResponses);
          return newResponses;
        });

        // Clear any existing timeout for this kiosk
        if (pingTimeoutsRef.current[macAddress]) {
          console.log(`Clearing existing timeout for ${macAddress}`);
          clearTimeout(pingTimeoutsRef.current[macAddress]);
          delete pingTimeoutsRef.current[macAddress];
          console.log(`Timer reset for ${macAddress} at ${new Date().toLocaleTimeString()}`);
        }

        // Set a new timeout for this kiosk
        pingTimeoutsRef.current[macAddress] = setTimeout(() => {
          console.log(`Timeout for ${macAddress} - no ping response received`);
          setPingResponses(prev => ({
            ...prev,
            [macAddress]: false
          }));
        }, 25000);
      }
      return;
    }
    
    // Only process messages from status topics
    if (!topic.endsWith('/status')) {
      console.log("Ignoring non-status message from topic:", topic);
      return;
    }

    const macAddress = topic.split("/")[1];
    console.log("Extracted MAC address:", macAddress);
    const messageText = message.toString();
    console.log("Message content:", messageText);
    const timestamp = Date.now();
    
    // Update the ref first
    if (!mqttLogsRef.current[macAddress]) {
      console.log("Creating new log array for MAC:", macAddress);
      mqttLogsRef.current[macAddress] = [];
    }
    
    // Add the new message at the beginning with timestamp
    mqttLogsRef.current[macAddress].unshift({ text: messageText, timestamp });
    console.log("Updated logs for MAC:", macAddress, mqttLogsRef.current[macAddress]);
    
    // Keep only the last 15 messages
    if (mqttLogsRef.current[macAddress].length > 15) {
      mqttLogsRef.current[macAddress].pop();
    }
    
    // Update the state with the new logs
    setMqttLogs({ ...mqttLogsRef.current });
    console.log("Updated MQTT logs state:", mqttLogsRef.current);

    // Set up individual timer for this specific message
    setTimeout(() => {
      if (mqttLogsRef.current[macAddress]) {
        // Only remove this specific message
        mqttLogsRef.current[macAddress] = mqttLogsRef.current[macAddress].filter(
          msg => msg.timestamp !== timestamp
        );
        setMqttLogs({ ...mqttLogsRef.current });
      }
    }, 15000);
  };
};

// Create MQTT client function outside the component
const createMqttClient = (kiosksData, subscribedTopicsRef, setMqttLogs, mqttLogsRef, setPingResponses, pingTimeoutsRef) => {
  console.log("Creating new MQTT client");
  console.log("Available kiosks data:", kiosksData);
  const client = mqtt.connect(
    "wss://0ec065087cf84d309f1c73b00c9441f8.s1.eu.hivemq.cloud:8884/mqtt",
    {
      username: "admin",
      password: "Password1234",
      clean: true,
      reconnectPeriod: 0,
      clientId: 'kiosk_management_' + Math.random().toString(16).substr(2, 8),
      protocolVersion: 4,
      protocol: 'wss',
      rejectUnauthorized: false
    }
  );

  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to topics for all kiosks
    Object.entries(kiosksData).forEach(([macAddress]) => {
      const pingTopic = `kiosks/${macAddress}/ping`;
      const statusTopic = `kiosks/${macAddress}/status`;
      
      // Subscribe to both ping and status topics
      client.subscribe(pingTopic, { qos: 0, retain: false }, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${pingTopic}:`, err);
        } else {
          console.log(`Successfully subscribed to ${pingTopic}`);
        }
      });
      
      client.subscribe(statusTopic, { qos: 0, retain: false }, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${statusTopic}:`, err);
        } else {
          console.log(`Successfully subscribed to ${statusTopic}`);
        }
      });

      // Set initial timeout for each kiosk
      pingTimeoutsRef.current[macAddress] = setTimeout(() => {
        console.log(`Initial timeout for ${macAddress} - no ping response received`);
        setPingResponses(prev => ({
          ...prev,
          [macAddress]: false
        }));
      }, 25000);
    });
  });

  // Use the message handler from the outer scope
  client.on('message', createMessageHandler(client, setMqttLogs, mqttLogsRef, setPingResponses, pingTimeoutsRef));

  client.on('error', (error) => {
    console.error('MQTT Error:', error);
  });

  client.on('close', () => {
    console.log('MQTT client connection closed');
  });

  return client;
};

// Kiosk State Components
const InactiveState = ({ kiosk }) => (
  <>
    <div className="d-inline-flex align-items-center justify-content-center rounded-circle me-2 bg-light" 
         style={{ 
           width: '32px', 
           height: '32px', 
           border: '2px solid #dee2e6'
         }}>
      <i className="fas fa-bolt text-muted"></i>
    </div>
    <div>
      <div className="fw-medium mb-1">
        <span className="text-muted">Inactive</span>
      </div>
      <div>
        <small className="text-muted">
          Device not responding
        </small>
      </div>
    </div>
  </>
);

const ConnectingState = () => (
  <div className="d-flex align-items-center w-100 justify-content-center">
    <div className="spinner-border spinner-border-sm text-secondary me-2" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    <span className="text-muted">Checking power status...</span>
  </div>
);

const ActiveState = ({ kiosk }) => (
  <>
    <div className={`d-inline-flex align-items-center justify-content-center rounded-circle me-2 ${kiosk.charging ? 'bg-warning' : 'bg-light'}`} 
         style={{ 
           width: '32px', 
           height: '32px', 
           border: '2px solid', 
           borderColor: kiosk.charging ? '#ffc107' : '#dee2e6',
           transition: 'all 0.5s ease'
         }}>
      <i className={`fas fa-bolt ${kiosk.charging ? 'text-dark' : 'text-muted'}`}
         style={{ transition: 'color 0.5s ease' }}></i>
    </div>
    <div>
      <div className="fw-medium mb-1" style={{ transition: 'color 0.5s ease' }}>
        {kiosk.charging ? (
          <>
            <span className="text-warning">USB-PD Charging</span>
            <i className="fas fa-bolt ms-2 text-warning"></i>
          </>
        ) : (
          <span className="text-muted">On Battery</span>
        )}
      </div>
      <div>
        <small className="text-muted" style={{ transition: 'color 0.5s ease' }}>
          {kiosk.charging ? (
            <>
              {kiosk.USB_PD_contract_v}V/{kiosk.USB_PD_contract_i}A ({(kiosk.USB_PD_contract_v * kiosk.USB_PD_contract_i).toFixed(0)}W)
            </>
          ) : (
            <>
              <i className="fas fa-battery-three-quarters me-1"></i>
              Battery: {parseFloat(kiosk.batteryVoltage || 0).toFixed(2)}V
            </>
          )}
        </small>
      </div>
    </div>
  </>
);

const KioskCard = ({ id, kiosk, pingResponses, mqttLogs }) => {
  const isConnecting = pingResponses[id] === undefined;
  const isActive = pingResponses[id] === true;
  const isInactive = pingResponses[id] === false;

  // Common styles for consistent transitions
  const cardStyle = {
    transition: 'all 0.5s ease',
    backgroundColor: isInactive ? '#dee2e6' : 
      isConnecting ? '#dee2e6' : 
      isActive ? 'white' : '#dee2e6'
  };

  const textStyle = {
    transition: 'color 0.5s ease',
    color: isInactive || isConnecting ? '#6c757d' : 'inherit'
  };

  const badgeStyle = {
    transition: 'all 0.5s ease',
    minWidth: '120px',
    justifyContent: 'center'
  };

  const progressBarStyle = {
    height: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '5px',
    transition: 'all 0.5s ease'
  };

  const powerStatusStyle = {
    backgroundColor: isInactive ? '#f8f9fa' :
      isConnecting ? '#f8f9fa' : 
      kiosk.charging ? '#fff3cd' : '#f8f9fa',
    transition: 'all 0.5s ease'
  };

  // Create a unique key for this kiosk's state
  const stateKey = `${id}-${isInactive}-${isConnecting}-${isActive}`;

  return (
    <div key={stateKey} className="card h-100 border-0 shadow-sm hover-shadow position-relative" style={cardStyle}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip>
                <div className="text-start">
                  <strong>MAC:</strong> {id}<br/>
                  <strong>CHIP:</strong> {kiosk.esp32Type || 'Unknown'}
                </div>
              </Tooltip>
            }
          >
            <h5 className="card-title mb-0 d-flex align-items-center">
              <i className="fas fa-tablet-alt text-primary me-2"></i>
              {kiosk.name}
            </h5>
          </OverlayTrigger>
          <span className={`badge ${
            isInactive ? 'bg-danger' :
            isConnecting ? 'bg-primary' :
            isActive ? 'bg-success' : 'bg-danger'
          } px-4 py-2 d-flex align-items-center`}
                style={badgeStyle}>
            {isInactive ? (
              <>
                <i className="fas fa-power-off me-2"></i>
                <span>Inactive</span>
              </>
            ) : isConnecting ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span>Connecting...</span>
              </>
            ) : isActive ? (
              <>
                <i className="fas fa-signal me-2"></i>
                <span>Active</span>
              </>
            ) : (
              <>
                <i className="fas fa-power-off me-2"></i>
                <span>Inactive</span>
              </>
            )}
          </span>
        </div>

        <div className="row g-3">
          <div className="col-6">
            <div className="d-flex flex-column">
              <small className="text-muted d-flex align-items-center mb-1">
                <i className="fas fa-map-marker-alt" style={{ width: '16px' }}></i>
                <span className="ms-2">Location</span>
              </small>
              <p className="mb-0 fw-medium ms-4" style={textStyle}>
                {isInactive ? '' :
                  isConnecting ? '...' : 
                  isActive ? kiosk.location : ''}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex flex-column">
              <small className="text-muted d-flex align-items-center mb-1">
                <i className="fas fa-wifi text-primary" style={{ width: '16px' }}></i>
                <span className="ms-2">Network</span>
              </small>
              <p className="mb-0 fw-medium ms-4" style={textStyle}>
                {isInactive ? 'Not Connected' :
                  isConnecting ? '...' : 
                  isActive ? kiosk.networkSSID : 'Not Connected'}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex flex-column">
              <small className="text-muted d-flex align-items-center mb-1">
                <i className="fas fa-code-branch" style={{ width: '16px' }}></i>
                <span className="ms-2">Firmware Version</span>
              </small>
              <p className="mb-0 fw-medium ms-4" style={textStyle}>
                {isInactive ? '' :
                  isConnecting ? '...' : 
                  isActive ? kiosk.firmwareVersion : ''}
              </p>
            </div>
          </div>
          <div className="col-12">
            <small className="text-muted d-block mb-1">
              <i className="fas fa-battery-half me-1"></i>
              Battery Level
            </small>
            <div className="d-flex align-items-center">
              <div className="progress flex-grow-1 me-2" style={progressBarStyle}>
                {isInactive ? (
                  <div className="progress-bar bg-secondary"
                       role="progressbar"
                       style={{ width: '0%' }}
                       aria-valuenow="0"
                       aria-valuemin="0"
                       aria-valuemax="100">
                  </div>
                ) : isConnecting ? (
                  <div className="progress-bar progress-bar-striped progress-bar-animated bg-secondary"
                       role="progressbar"
                       style={{ width: '100%' }}
                       aria-valuenow="100"
                       aria-valuemin="0"
                       aria-valuemax="100">
                  </div>
                ) : (
                  <div 
                    className={`progress-bar ${
                      kiosk.batteryLevel > 60 ? 'bg-success' :
                      kiosk.batteryLevel > 20 ? 'bg-warning' :
                      'bg-danger'
                    }`}
                    role="progressbar"
                    style={{ 
                      width: `${kiosk.batteryLevel}%`,
                      transition: 'all 0.5s ease'
                    }}
                    aria-valuenow={kiosk.batteryLevel}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                )}
              </div>
              <span className="fw-medium" style={{ ...textStyle, minWidth: '48px' }}>
                {isInactive ? 'N/A' :
                  isConnecting ? '...' : 
                  isActive ? `${kiosk.batteryLevel}%` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="col-12">
            <small className="text-muted d-block mb-1">
              <i className="fas fa-plug me-1"></i>
              Power Status
            </small>
            <div className="d-flex align-items-center p-2 rounded" style={powerStatusStyle}>
              {isInactive ? (
                <InactiveState kiosk={kiosk} />
              ) : isConnecting ? (
                <ConnectingState />
              ) : (
                <ActiveState kiosk={kiosk} />
              )}
            </div>
          </div>
          <div className="col-12">
            {isActive && (
              <>
                <small className="text-muted d-block mb-1">
                  <i className="fas fa-info-circle me-1"></i>
                  Status Log
                </small>
                <div className="mb-0 fw-medium" style={{ 
                  maxHeight: '100px', 
                  overflowY: 'auto', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '5px', 
                  padding: '5px',
                  backgroundColor: 'white'
                }}>
                  {mqttLogs[id] && mqttLogs[id].length > 0 ? (
                    mqttLogs[id].map((msg, index) => (
                      <div 
                        key={`${id}-${typeof msg === 'string' ? msg : msg.timestamp}`}
                        className={`text-muted small py-1 ${index === 0 ? 'new-message' : ''}`}
                      >
                        {typeof msg === 'string' ? msg : msg.text}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted small">No recent messages</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [kiosksData, setKiosksData] = useState(null);
  const [mqttLogs, setMqttLogs] = useState({});
  const [pingResponses, setPingResponses] = useState({});
  const mqttClientRef = useRef(null);
  const subscribedTopicsRef = useRef(new Set());
  const mqttLogsRef = useRef({});
  const pingTimeoutsRef = useRef({});

  // Separate effect for fetching kiosks data
  useEffect(() => {
    const kiosksRef = ref(database, "kiosks");
    const unsubscribe = onValue(kiosksRef, (snapshot) => {
      const data = snapshot.val();
      const kiosksArray = data
        ? Object.keys(data).map((key) => ({
            value: key,
            label: data[key].name,
          }))
        : [];
      setKiosks(kiosksArray);
      setKiosksData(data);
      console.log("Database updated at", new Date().toLocaleTimeString(), "with data:", data);
    });

    return () => unsubscribe();
  }, []);

  // Separate effect for GitHub releases
  useEffect(() => {
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
  }, []); // Empty dependency array since we only want to fetch releases once

  // MQTT Client Effect
  useEffect(() => {
    if (!kiosksData) return; // Don't set up MQTT client until we have kiosk data

    let client = null;
    const timeouts = { ...pingTimeoutsRef.current }; // Copy ref value at effect creation

    // Create MQTT client if it doesn't exist
    client = createMqttClient(kiosksData, subscribedTopicsRef, setMqttLogs, mqttLogsRef, setPingResponses, pingTimeoutsRef);
    mqttClientRef.current = client;  // Store the client in the ref

    // Cleanup function
    return () => {
      // Clear all timeouts
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
      
      // Unsubscribe from all topics
      if (client) {
        Object.entries(kiosksData).forEach(([macAddress]) => {
          const pingTopic = `kiosks/${macAddress}/ping`;
          const statusTopic = `kiosks/${macAddress}/status`;
          client.unsubscribe(pingTopic);
          client.unsubscribe(statusTopic);
        });
        client.end();
      }
    };
  }, [kiosksData]); // Only depend on kiosksData

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .new-message {
        animation: highlight 2s ease-in-out;
      }
      @keyframes highlight {
        0% { background-color: #d1e7dd; }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
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
        setUploadProgress(50);
      } else if (updateMethod === "custom") {
        if (!customFirmware) {
          throw new Error("Please select a firmware file");
        }

        const fileRef = storageRef(storage, `firmware/${Date.now()}-${customFirmware.name}`);
        await uploadBytes(fileRef, customFirmware);
        setUploadProgress(50);
        firmwareUrl = await getDownloadURL(fileRef);
        setUploadProgress(75);
      }

      if (!firmwareUrl) {
        throw new Error("No firmware URL available");
      }

      setUploadProgress(90);

      let messagesSent = 0;
      selectedKiosks.forEach((kiosk) => {
        const topic = `kiosks/${kiosk.value}/update`;
        const message = JSON.stringify({
          firmware_version: updateMethod === "github" ? selectedVersion.value : "custom",
          download_url: firmwareUrl,
        }).replace(/"/g, '');
        
        console.log(`Publishing to topic ${topic}:`, message);

        if (mqttClientRef.current && mqttClientRef.current.connected) {
          mqttClientRef.current.publish(topic, message, (err) => {
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
        } else {
          throw new Error("MQTT client not connected");
        }
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
    <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto p-4" style={{ backgroundColor: '#f8f9fa' }}>
      <Row>
        {/* Kiosk Status Section */}
        <Col md={8}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white py-3">
              <h3 className="mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Kiosk Status
              </h3>
            </Card.Header>
            <Card.Body className="bg-white">
              {kiosksData && (
                <div className="row g-4">
                  {Object.entries(kiosksData).map(([id, kiosk]) => (
                    <div key={id} className="col-md-6">
                      <KioskCard 
                        id={id}
                        kiosk={kiosk}
                        pingResponses={pingResponses}
                        mqttLogs={mqttLogs}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Firmware Update Section */}
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white py-3">
              <h3 className="mb-0">
                <i className="fas fa-upload me-2"></i>
                Update Firmware
              </h3>
            </Card.Header>
            <Card.Body className="bg-white">
              <Form>
                <Form.Group controlId="updateMethod" className="mb-4">
                  <Form.Label className="mb-3 fw-medium">Update Method</Form.Label>
                  <div className="d-flex gap-3">
                    <Button
                      variant={updateMethod === "github" ? "primary" : "outline-primary"}
                      className={`flex-grow-1 py-3 ${updateMethod === "github" ? 'shadow-sm' : ''}`}
                      style={{ transition: 'all 0.3s ease' }}
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
                      className={`flex-grow-1 py-3 ${updateMethod === "custom" ? 'shadow-sm' : ''}`}
                      style={{ transition: 'all 0.3s ease' }}
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
                  <Form.Label className="fw-medium">Select Kiosks to Update</Form.Label>
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
                    className="shadow-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#dee2e6',
                        '&:hover': {
                          borderColor: '#0d6efd'
                        }
                      })
                    }}
                  />
                </Form.Group>

                {updateMethod === "github" ? (
                  <Form.Group controlId="selectVersion" className="mb-4">
                    <Form.Label className="fw-medium">Select Release Version</Form.Label>
                  <Select
                    options={releaseVersions}
                    value={selectedVersion}
                    onChange={setSelectedVersion}
                      className="shadow-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: '#dee2e6',
                          '&:hover': {
                            borderColor: '#0d6efd'
                          }
                        })
                      }}
                  />
                </Form.Group>
                ) : (
                  <Form.Group controlId="customFirmware" className="mb-4">
                    <Form.Label className="fw-medium">Upload Firmware File</Form.Label>
                    <div
                      {...getRootProps()}
                      className={`p-4 border rounded text-center shadow-sm ${
                        isDragActive ? "border-primary bg-light" : "border-dashed"
                      }`}
                      style={{ transition: 'all 0.3s ease' }}
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
                  <Alert variant="danger" className="mt-3 shadow-sm">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert variant="success" className="mt-3 shadow-sm">
                    <div className="d-flex flex-column align-items-center">
                      <i className="fas fa-check-circle fa-2x mb-2 text-success"></i>
                      <p className="mb-2">{success.message}</p>
                      <Button
                        variant="outline-primary"
                        href={success.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-100 text-center shadow-sm"
                        style={{ transition: 'all 0.3s ease' }}
                      >
                        <i className="fas fa-download me-2"></i>
                        Download {success.fileName}
                      </Button>
                    </div>
                  </Alert>
                )}

                <Button
                  variant="primary"
                  className="mt-4 w-100 py-3 shadow-sm"
                  onClick={handleUpdateFirmware}
                  disabled={
                    selectedKiosks.length === 0 ||
                    (updateMethod === "github" && !selectedVersion) ||
                    (updateMethod === "custom" && !customFirmware) ||
                    isUploading
                  }
                  style={{ transition: 'all 0.3s ease' }}
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

      {/* Loading Overlay */}
      {isUploading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)', zIndex: 1000 }}>
          <div className="text-center p-4 rounded-3 bg-white shadow-lg">
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
            <p className="text-primary mb-0 fw-medium">
              {uploadProgress < 50 ? "Uploading firmware..." :
               uploadProgress < 75 ? "Processing..." :
               uploadProgress < 90 ? "Connecting to devices..." :
               "Sending update..."}
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}

export default KioskManagement;
