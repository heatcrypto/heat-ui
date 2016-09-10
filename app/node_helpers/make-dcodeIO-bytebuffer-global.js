try {
  window.ByteBuffer = window.dcodeIO.ByteBuffer;
  window.Long = window.dcodeIO.Long;
} catch(e) {
  console.log("Could not make ByteBuffer and Long from dcodeIO nodejs module globally available.")
}