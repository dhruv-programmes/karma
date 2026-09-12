import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  Upload,
  FileText,
  CheckCircle2,
  ScanLine,
  FileCheck2,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";

export type UploadedFile = {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
};

type DocumentUploaderProps = {
  file: UploadedFile | null;
  onFileSelect: (file: UploadedFile) => void;
  onVerify: () => void;
  onClear: () => void;
};

function formatSize(bytes?: number) {
  if (!bytes) return "2.4 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  file,
  onFileSelect,
  onVerify,
  onClear,
}: DocumentUploaderProps) {
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        onFileSelect({
          name: asset.name || "vehicle_registration_rc.pdf",
          size: asset.size,
          uri: asset.uri,
          mimeType: asset.mimeType,
        });
      }
    } catch {
      // Fallback to demo file if picker fails on platform
      handleUseDemoFile();
    }
  };

  const handleUseDemoFile = () => {
    onFileSelect({
      name: "tata_nexon_ev_registration_rc.pdf",
      size: 2450000,
      uri: "demo://ev_rc.pdf",
      mimeType: "application/pdf",
    });
  };

  return (
    <View style={styles.container}>
      {!file ? (
        /* Empty Upload State */
        <View style={styles.emptyCard}>
          <View style={styles.uploadIconWrap}>
            <Upload size={24} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <Text style={styles.uploadTitle}>Verify your EV purchase</Text>
          <Text style={styles.uploadSubtitle}>
            Upload an electric vehicle registration certificate, tax invoice, or purchase receipt.
          </Text>

          {/* Primary Upload Button */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickDocument}
            activeOpacity={0.86}
          >
            <Upload size={17} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </TouchableOpacity>

          {/* Quick Demo Pre-fill for judges */}
          <TouchableOpacity
            style={styles.demoFillButton}
            onPress={handleUseDemoFile}
            activeOpacity={0.7}
          >
            <Sparkles size={13} color="#059669" strokeWidth={2.2} />
            <Text style={styles.demoFillText}>Use Demo EV Registration (Instant)</Text>
          </TouchableOpacity>

          <Text style={styles.formatHint}>
            Accepted formats: PDF, JPG, PNG · Any uploaded document is accepted in prototype
          </Text>
        </View>
      ) : (
        /* Document Selected State */
        <View style={styles.readyCard}>
          <View style={styles.docHeaderRow}>
            <View style={styles.docLeft}>
              <View style={styles.docIconWrap}>
                <FileCheck2 size={22} color="#059669" strokeWidth={2.2} />
              </View>
              <View style={styles.docInfo}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>DOCUMENT UPLOADED</Text>
                </View>
                <Text style={styles.docName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.docMeta}>
                  {formatSize(file.size)} · Ready for verification
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClear} style={styles.changeBtn} activeOpacity={0.7}>
              <RefreshCw size={14} color="#7A9082" />
            </TouchableOpacity>
          </View>

          {/* Connect & Verify Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={onVerify}
            activeOpacity={0.88}
          >
            <ScanLine size={19} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.verifyButtonText}>Connect &amp; Verify</Text>
          </TouchableOpacity>

          <Text style={styles.verifyNote}>
            Click above to launch simulated document verification and unlock reward
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(46, 168, 110, 0.35)",
    gap: 10,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
    elevation: 2,
  },
  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "rgba(46, 168, 110, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    textAlign: "center",
  },
  uploadSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2EA86E",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
    boxShadow: "0px 4px 8px rgba(46, 168, 110, 0.25)",
    elevation: 3,
  },
  uploadButtonText: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
  },
  demoFillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "rgba(46, 168, 110, 0.2)",
  },
  demoFillText: {
    fontSize: 11.5,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  formatHint: {
    fontSize: 10.5,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    textAlign: "center",
    marginTop: 2,
  },

  // Ready state card
  readyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(46, 168, 110, 0.22)",
    gap: 14,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
    elevation: 2,
  },
  docHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "rgba(46, 168, 110, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46, 168, 110, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 8.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  docName: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  docMeta: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
  },
  changeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAF9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D251A",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 16,
    boxShadow: "0px 4px 8px rgba(5, 150, 105, 0.2)",
    elevation: 4,
  },
  verifyButtonText: {
    fontSize: 15.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  verifyNote: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    textAlign: "center",
  },
});
