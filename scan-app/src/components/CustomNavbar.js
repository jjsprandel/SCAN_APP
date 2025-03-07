import React from "react";
import { Navbar, Nav } from "react-bootstrap";

function CustomNavbar() {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Navbar.Brand href="/" className="ms-3">
        SCAN
      </Navbar.Brand>
      <Nav className="mx-auto">
        <Nav.Link href="/" className="px-3">
          Analytics Dashboard
        </Nav.Link>
        <Nav.Link href="/activity-log" className="px-3">
          Activity Log
        </Nav.Link>
        <Nav.Link href="/user-management" className="px-3">
          User Management
        </Nav.Link>
      </Nav>
      <Nav className="">
        <Nav.Link href="/profile">
          <img
            src="/imgs/profile.png"
            alt="Profile"
            className="img-fluid"
            style={{ width: "30px", height: "30px", borderRadius: "50%" }}
          />
        </Nav.Link>
      </Nav>
    </Navbar>
  );
}

export default CustomNavbar;
