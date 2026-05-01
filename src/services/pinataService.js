import axios from "axios";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

const PINATA_FILE_URL =
  "https://api.pinata.cloud/pinning/pinFileToIPFS";

const PINATA_JSON_URL =
  "https://api.pinata.cloud/pinning/pinJSONToIPFS";

/*
========================
UPLOAD IMAGE TO IPFS
========================
*/
export const uploadImageToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      PINATA_FILE_URL,
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    const cid = response.data.IpfsHash;

    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  } catch (error) {
    console.error("Upload Image Error:", error);
    throw error;
  }
};

/*
========================
UPLOAD METADATA TO IPFS
========================
*/
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    const response = await axios.post(
      PINATA_JSON_URL,
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    const cid = response.data.IpfsHash;

    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  } catch (error) {
    console.error("Upload Metadata Error:", error);
    throw error;
  }
};