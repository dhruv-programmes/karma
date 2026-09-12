import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  TicketPercent,
  Leaf,
  Building2,
  Sparkles,
  ShieldCheck,
  TreePine,
  Sun,
  Zap,
  RotateCcw,
  Check,
  Copy,
  Search,
  X,
  Gift,
  Coins,
  ChevronRight,
  Clock,
  ExternalLink,
  Award,
  Trees,
  Waves,
  Flame,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { useMe } from "@/src/hooks/queries";
import { useTabBarClearance } from "@/src/theme/layout";

export type CouponCategory = "all" | "govt" | "eco" | "partner" | "offsets";

export interface CouponItem {
  id: string;
  brand: string;
  category: "govt" | "eco" | "partner";
  title: string;
  perk: string;
  description: string;
  impactNote: string;
  costPts: number;
  code: string;
  verifiedBy: string;
  expiresIn: string;
  terms: string;
  ecoRelated: boolean;
}

export interface OffsetProject {
  id: string;
  title: string;
  location: string;
  certifier: string;
  impactKg: number;
  costPts: number;
  description: string;
  icon: any;
  color: string;
}

const STATIC_COUPONS: CouponItem[] = [
  // Government Subsidies (Eco & Clean Tech)
  {
    id: "govt-solar",
    brand: "Ministry of New & Renewable Energy",
    category: "govt",
    title: "National Rooftop Solar Subsidy",
    perk: "₹5,000 Direct Rebate",
    description: "Instant government rebate voucher on empanelled 2kW-5kW residential solar rooftop installation.",
    impactNote: "Saves ~180 kg CO₂e / month",
    costPts: 300,
    code: "MNRE-SOLAR-2026",
    verifiedBy: "Govt of India Verified",
    expiresIn: "Valid for 60 days",
    terms: "Applicable on authorized MNRE vendor installs nationwide. One voucher per household.",
    ecoRelated: true,
  },
  {
    id: "govt-ev-charge",
    brand: "Bureau of Energy Efficiency",
    category: "govt",
    title: "Public EV Fast-Charging Credits",
    perk: "50 Free kWh Charging",
    description: "Complimentary EV fast charging credits across all municipal public chargers and highway stations.",
    impactNote: "Avoids ~42 kg fuel emissions",
    costPts: 180,
    code: "BEE-ECHARGE-50",
    verifiedBy: "BEE Green Mobility",
    expiresIn: "Valid for 90 days",
    terms: "Redeemable in all municipal and NHAI corridor high-speed EV charging plazas.",
    ecoRelated: true,
  },
  {
    id: "govt-compost",
    brand: "Clean City Municipal Action",
    category: "govt",
    title: "Home Aeration Composter Kit",
    perk: "100% Free Composter Kit",
    description: "Full dual-drum odor-free home composting kit with 6-month supply of bio-enzyme starter cultures.",
    impactNote: "Diverts ~25 kg organic waste/mo",
    costPts: 140,
    code: "MUNI-COMPOST-FREE",
    verifiedBy: "Swachh Bharat Mission",
    expiresIn: "Valid for 30 days",
    terms: "Home delivery included. Requires municipal residential address confirmation.",
    ecoRelated: true,
  },
  {
    id: "govt-metro",
    brand: "State Metro Rail Corporation",
    category: "govt",
    title: "Green Transit Smart Pass",
    perk: "10 Free Metro Rides",
    description: "Digital transit pass loaded with 10 free rides on electrified metro lines and electric feeder buses.",
    impactNote: "Saves ~18 kg commuting CO₂e",
    costPts: 160,
    code: "METRO-GREEN-10X",
    verifiedBy: "Urban Transit Authority",
    expiresIn: "Valid for 45 days",
    terms: "Can be scanned directly at metro automated fare collection gates via smart pass.",
    ecoRelated: true,
  },

  // Eco & Sustainable Partner Brands
  {
    id: "eco-patagonia",
    brand: "Patagonia Worn Wear",
    category: "eco",
    title: "Garment Care & Recycled Outerwear",
    perk: "30% Off Repairs & Gear",
    description: "Special circular discount on certified repair services and Patagonia recycled fleece & shell lines.",
    impactNote: "Extends jacket life by 4+ years",
    costPts: 220,
    code: "PATA-WORN-30X",
    verifiedBy: "1% For The Planet",
    expiresIn: "Valid for 30 days",
    terms: "Valid online at Worn Wear and at all flagship Patagonia stores for repair or secondhand items.",
    ecoRelated: true,
  },
  {
    id: "eco-allbirds",
    brand: "Allbirds Eco Footwear",
    category: "eco",
    title: "SweetFoam & Merino Wool Shoes",
    perk: "₹1,200 Off Any Pair",
    description: "Voucher for zero-carbon certified sneakers crafted from sugarcane SweetFoam and eucalyptus pulp.",
    impactNote: "Crafted with 60% less footprint",
    costPts: 250,
    code: "ALLBIRDS-KARMA-1200",
    verifiedBy: "B-Corp Certified",
    expiresIn: "Valid for 45 days",
    terms: "Applicable on full-price sustainable sneakers. Free shipping & carbon-neutral delivery.",
    ecoRelated: true,
  },
  {
    id: "eco-zerowaste",
    brand: "Bare Necessities Zero Waste",
    category: "eco",
    title: "Package-Free Pantry & Body Care",
    perk: "₹400 Off Refills",
    description: "Redeemable on bulk food grains, solid shampoo bars, bamboo toothbrushes, and refillable cleaners.",
    impactNote: "Eliminates ~14 single-use plastics",
    costPts: 120,
    code: "BARE-CIRCULAR-400",
    verifiedBy: "Zero Waste Alliance",
    expiresIn: "Valid for 30 days",
    terms: "Valid on orders above ₹800. Glass containers returnable for additional in-store credit.",
    ecoRelated: true,
  },
  {
    id: "eco-blueland",
    brand: "Blueland Clean Tech",
    category: "eco",
    title: "Plastic-Free Cleaning Starter Kit",
    perk: "25% Off Forever Bottles",
    description: "Forever shatterproof bottles with dissolvable botanical surface and dish wash tablet refills.",
    impactNote: "Prevents shipping 80% heavy water",
    costPts: 150,
    code: "BLUELAND-25-GREEN",
    verifiedBy: "Climate Neutral Certified",
    expiresIn: "Valid for 45 days",
    terms: "Valid on all starter kits and bulk subscription refills.",
    ecoRelated: true,
  },
  {
    id: "eco-ecovessel",
    brand: "EcoVessel Thermal Gear",
    category: "eco",
    title: "Triple-Insulated Stainless Bottles",
    perk: "35% Off Lifetime Bottles",
    description: "Durable condensation-free stainless steel bottles that keep beverages cold for 36 hours.",
    impactNote: "Saves ~300 disposable cups/yr",
    costPts: 130,
    code: "ECOVESSEL-35-LOOP",
    verifiedBy: "Fair Trade Member",
    expiresIn: "Valid for 60 days",
    terms: "Includes lifetime leak-proof warranty and replaceable silicone seals.",
    ecoRelated: true,
  },

  // Lifestyle, Thrift & Local Circular Partners
  {
    id: "partner-relove",
    brand: "Relove Thrift Collective",
    category: "partner",
    title: "Authenticated Vintage & Pre-Owned",
    perk: "₹500 Off Secondhand",
    description: "Curated vintage denim, designer archival jackets, and pre-loved premium streetwear.",
    impactNote: "Saves ~8,000L water vs new denim",
    costPts: 180,
    code: "RELOVE-THRIFT-500",
    verifiedBy: "Circular Fashion Hub",
    expiresIn: "Valid for 30 days",
    terms: "Applicable on orders above ₹1,200. Every item steam-sanitized & authenticated.",
    ecoRelated: true,
  },
  {
    id: "partner-repair",
    brand: "Local Master Repair Network",
    category: "partner",
    title: "Electronics & Leather Restoration",
    perk: "₹350 Repair Subsidy",
    description: "Certified credit towards battery replacement, shoe resoling, or zipper & jacket stitching.",
    impactNote: "Keeps durable items out of landfill",
    costPts: 110,
    code: "REPAIR-LOCAL-350",
    verifiedBy: "Right to Repair Partner",
    expiresIn: "Valid for 60 days",
    terms: "Accepted at 45+ neighborhood verified cobblers, tailors, and hardware fixers.",
    ecoRelated: true,
  },
  {
    id: "partner-organic",
    brand: "First Harvest Organic Farms",
    category: "partner",
    title: "Farm-to-Door Pesticide-Free CSA",
    perk: "20% Off Weekly Basket",
    description: "Regeneratively farmed organic seasonal vegetables, heirloom grains, and cold-pressed oils.",
    impactNote: "Cultivated with regenerative soil",
    costPts: 130,
    code: "HARVEST-ORGANIC-20",
    verifiedBy: "Organic India Certified",
    expiresIn: "Valid for 30 days",
    terms: "Valid on first 2 subscription vegetable boxes. Zero cold-storage chemicals.",
    ecoRelated: true,
  },
  {
    id: "partner-bike",
    brand: "City Cycle Works",
    category: "partner",
    title: "Complete Bicycle Overhaul & Safety Tune",
    perk: "Free 21-Point Tune-Up",
    description: "Brake adjustment, derailleur indexing, chain de-grease and ultrasonic relubrication.",
    impactNote: "Supports zero-emission commute",
    costPts: 120,
    code: "CYCLE-TUNEUP-FREE",
    verifiedBy: "Pedal Power Network",
    expiresIn: "Valid for 45 days",
    terms: "Walk-in with coupon code at any partner bike shop. Includes free brake pad check.",
    ecoRelated: true,
  },
];

const STATIC_OFFSETS: OffsetProject[] = [
  {
    id: "offset-ghats",
    title: "Western Ghats Rainforest Revival",
    location: "Karnataka & Kerala Biome",
    certifier: "Gold Standard Verified",
    impactKg: 40,
    costPts: 100,
    description: "Plant and nurture 2 native endemic trees (Teak, Bamboo, Indian Rosewood) in degraded biodiversity corridors.",
    icon: Trees,
    color: "#2EA86E",
  },
  {
    id: "offset-mangrove",
    title: "Sundarbans Coastal Carbon Sink",
    location: "Tidal Delta Coastlines",
    certifier: "UN Climate Action Plan",
    impactKg: 75,
    costPts: 150,
    description: "Protect and restore 15 square meters of blue carbon tidal mangroves that filter sea surges and sequester carbon 4x faster.",
    icon: Waves,
    color: "#0284C7",
  },
  {
    id: "offset-biogas",
    title: "Rural Family Bio-Gas Digesters",
    location: "Dharwad Agricultural Belt",
    certifier: "Verra VCS #1892",
    impactKg: 85,
    costPts: 180,
    description: "Convert dairy cow dung into clean methane cooking gas for smallholder farm families, eliminating heavy firewood smoke.",
    icon: Flame,
    color: "#D97706",
  },
  {
    id: "offset-school-solar",
    title: "Clean Solar Micro-Grids for Schools",
    location: "Rural Public Schools",
    certifier: "Clean Energy Access Fund",
    impactKg: 120,
    costPts: 220,
    description: "Fund 25 kWh of distributed solar generation to replace diesel generator backup power in primary schools.",
    icon: Sun,
    color: "#10B981",
  },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const me = useMe();

  // Local state for points balance (initial fallback 420 or from user profile)
  const [pointsBalance, setPointsBalance] = useState(
    me.data?.impact_points ?? 420
  );
  const [totalOffsetKg, setTotalOffsetKg] = useState(
    me.data?.offset_kg_total ?? 24
  );

  // Claimed vouchers list
  const [claimedCodes, setClaimedCodes] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<CouponCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [activeModalCoupon, setActiveModalCoupon] = useState<CouponItem | null>(
    null
  );
  const [activeOffsetDonation, setActiveOffsetDonation] =
    useState<OffsetProject | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Trigger feedback
  const triggerHaptics = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore simulator */
    }
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    let list = STATIC_COUPONS;
    if (selectedCategory === "govt") {
      list = list.filter((c) => c.category === "govt");
    } else if (selectedCategory === "eco") {
      list = list.filter((c) => c.ecoRelated && c.category !== "govt");
    } else if (selectedCategory === "partner") {
      list = list.filter((c) => c.category === "partner");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.brand.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.perk.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  // Handle coupon redemption
  const handleRedeemCoupon = (coupon: CouponItem) => {
    if (claimedCodes[coupon.id]) {
      // Already claimed, just open detail modal
      setActiveModalCoupon(coupon);
      return;
    }

    if (pointsBalance < coupon.costPts) {
      setErrorToast(
        `Need ${coupon.costPts - pointsBalance} more Karma Coins to unlock!`
      );
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    // Deduct points & claim
    setPointsBalance((prev) => prev - coupon.costPts);
    setClaimedCodes((prev) => ({
      ...prev,
      [coupon.id]: coupon.code,
    }));
    triggerHaptics();
    setActiveModalCoupon(coupon);
  };

  // Handle offset donation
  const handleDonateOffset = (project: OffsetProject) => {
    if (pointsBalance < project.costPts) {
      setErrorToast(
        `Need ${project.costPts - pointsBalance} more Karma Coins to donate!`
      );
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    setPointsBalance((prev) => prev - project.costPts);
    setTotalOffsetKg((prev) => prev + project.impactKg);
    triggerHaptics();
    setActiveOffsetDonation(project);
  };

  const copyToClipboard = async (code: string) => {
    try {
      if (Platform.OS === "web") {
        navigator.clipboard.writeText(code);
      } else {
        await Share.share({ message: `Here is my Carbon Loop voucher: ${code}` });
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
      triggerHaptics();
    } catch {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  const claimedCount = Object.keys(claimedCodes).length;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: tabClearance + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>OFFERS & REWARDS</Text>
            <Text style={styles.title}>Coupons & Offsets</Text>
            <Text style={styles.subtitle}>
              Partner discounts, govt green subsidies & Karma Coin donations
            </Text>
          </View>
        </View>

        {/* Hero Balance Card */}
        <LinearGradient
          colors={["#0C2518", "#143C28", "#0B1D14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Subtle glow orb */}
          <View style={styles.heroGlowOrb} />

          <View style={styles.heroHeaderRow}>
            <View style={styles.coinsPill}>
              <Coins size={14} color="#5EEAD4" strokeWidth={2.2} />
              <Text style={styles.coinsPillText}>IMPACT BALANCE</Text>
            </View>
            <View style={styles.levelBadge}>
              <Award size={13} color="#FBBF24" strokeWidth={2.2} />
              <Text style={styles.levelBadgeText}>Level {me.data?.loop_level ?? 2}</Text>
            </View>
          </View>

          {/* Big Points Display */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceNumber}>{pointsBalance}</Text>
            <View style={styles.balanceMeta}>
              <Text style={styles.balanceUnit}>Karma Coins</Text>
              <Text style={styles.balanceSubtext}>Karma Coins Available</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{claimedCount}</Text>
              <Text style={styles.heroStatLabel}>Vouchers Claimed</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{totalOffsetKg} kg</Text>
              <Text style={styles.heroStatLabel}>CO₂e Offset</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{STATIC_COUPONS.length}</Text>
              <Text style={styles.heroStatLabel}>Live Offers</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Error Toast Notification */}
        {errorToast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{errorToast}</Text>
          </View>
        ) : null}

        {/* Claimed Vouchers Banner (if any) */}
        {claimedCount > 0 ? (
          <View style={styles.activeWalletCard}>
            <View style={styles.activeWalletHeader}>
              <TicketPercent size={18} color="#2EA86E" strokeWidth={2.2} />
              <Text style={styles.activeWalletTitle}>
                My Active Wallet ({claimedCount})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            >
              {Object.entries(claimedCodes).map(([couponId, code]) => {
                const item = STATIC_COUPONS.find((c) => c.id === couponId);
                if (!item) return null;
                return (
                  <TouchableOpacity
                    key={couponId}
                    style={styles.walletTicket}
                    onPress={() => setActiveModalCoupon(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.walletTicketLeft}>
                      <Text style={styles.walletTicketPerk}>{item.perk}</Text>
                      <Text style={styles.walletTicketBrand} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    </View>
                    <View style={styles.walletTicketRight}>
                      <Text style={styles.walletTicketCode}>{code}</Text>
                      <Text style={styles.walletTicketTap}>Tap to view</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#7A9082" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search brand, solar, EV, thrift, composter..."
            placeholderTextColor="#7A9082"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#7A9082" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "all" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("all")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "all" && styles.categoryTextActive,
              ]}
            >
              All Offers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "govt" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("govt")}
            activeOpacity={0.8}
          >
            <Building2
              size={13}
              color={selectedCategory === "govt" ? "#0D1811" : "#2EA86E"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "govt" && styles.categoryTextActive,
              ]}
            >
              Govt Subsidies (4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "eco" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("eco")}
            activeOpacity={0.8}
          >
            <Leaf
              size={13}
              color={selectedCategory === "eco" ? "#0D1811" : "#2EA86E"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "eco" && styles.categoryTextActive,
              ]}
            >
              Eco Brands (5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "partner" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("partner")}
            activeOpacity={0.8}
          >
            <RotateCcw
              size={13}
              color={selectedCategory === "partner" ? "#0D1811" : "#2EA86E"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "partner" && styles.categoryTextActive,
              ]}
            >
              Thrift & Local (4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "offsets" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("offsets")}
            activeOpacity={0.8}
          >
            <TreePine
              size={13}
              color={selectedCategory === "offsets" ? "#0D1811" : "#2EA86E"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "offsets" && styles.categoryTextActive,
              ]}
            >
              Donate Offsets
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* SECTION: Donate to Carbon Offsets Using Points */}
        {(selectedCategory === "all" || selectedCategory === "offsets") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <TreePine size={18} color="#2EA86E" strokeWidth={2.2} />
                <Text style={styles.sectionTitle}>Donate to Offsets</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Redeem your Karma Coins directly into verified climate impact
              </Text>
            </View>

            <View style={styles.offsetsGrid}>
              {STATIC_OFFSETS.map((project) => {
                const canAfford = pointsBalance >= project.costPts;
                const ProjectIcon = project.icon;

                return (
                  <View key={project.id} style={styles.offsetCard}>
                    <View style={styles.offsetCardTop}>
                      <View
                        style={[
                          styles.offsetIconBox,
                          { backgroundColor: `${project.color}18` },
                        ]}
                      >
                        <ProjectIcon size={20} color={project.color} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offsetCertifier}>
                          {project.certifier}
                        </Text>
                        <Text style={styles.offsetTitle}>{project.title}</Text>
                      </View>
                      <View style={styles.offsetImpactPill}>
                        <Text style={styles.offsetImpactText}>
                          -{project.impactKg} kg
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.offsetDescription}>
                      {project.description}
                    </Text>

                    <View style={styles.offsetCardBottom}>
                      <View style={styles.offsetCostWrap}>
                        <Coins size={14} color="#D97706" strokeWidth={2.2} />
                        <Text style={styles.offsetCostText}>
                          {project.costPts} coins
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.offsetDonateButton,
                          !canAfford && styles.offsetDonateButtonDisabled,
                        ]}
                        onPress={() => handleDonateOffset(project)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.offsetDonateButtonText}>
                          {canAfford ? "Donate Karma Coins" : "Need Karma Coins"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION: Coupons List */}
        {selectedCategory !== "offsets" && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <TicketPercent size={18} color="#2EA86E" strokeWidth={2.2} />
                <Text style={styles.sectionTitle}>Partner & Govt Coupons</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {filteredCoupons.length} vouchers available for instant redemption
              </Text>
            </View>

            <View style={styles.couponsGrid}>
              {filteredCoupons.map((coupon) => {
                const isClaimed = !!claimedCodes[coupon.id];
                const canAfford = pointsBalance >= coupon.costPts;

                return (
                  <View key={coupon.id} style={styles.couponCard}>
                    {/* Top Pill / Badge */}
                    <View style={styles.couponCardHeader}>
                      <View
                        style={[
                          styles.categoryBadge,
                          coupon.category === "govt"
                            ? styles.categoryBadgeGovt
                            : styles.categoryBadgeEco,
                        ]}
                      >
                        {coupon.category === "govt" ? (
                          <Building2 size={11} color="#047857" strokeWidth={2.2} />
                        ) : (
                          <Leaf size={11} color="#047857" strokeWidth={2.2} />
                        )}
                        <Text style={styles.categoryBadgeText}>
                          {coupon.category === "govt"
                            ? "GOVT SCHEME"
                            : "CIRCULAR PARTNER"}
                        </Text>
                      </View>

                      <View style={styles.verifiedBadge}>
                        <ShieldCheck size={11} color="#2EA86E" strokeWidth={2.2} />
                        <Text style={styles.verifiedText}>{coupon.verifiedBy}</Text>
                      </View>
                    </View>

                    {/* Brand & Perk */}
                    <View style={styles.couponBody}>
                      <Text style={styles.couponBrand}>{coupon.brand}</Text>
                      <Text style={styles.couponPerk}>{coupon.perk}</Text>
                      <Text style={styles.couponTitle}>{coupon.title}</Text>
                      <Text style={styles.couponDescription}>
                        {coupon.description}
                      </Text>

                      {/* Environmental Impact highlight */}
                      <View style={styles.impactHighlightBox}>
                        <Leaf size={12} color="#2EA86E" strokeWidth={2} />
                        <Text style={styles.impactHighlightText}>
                          {coupon.impactNote}
                        </Text>
                      </View>
                    </View>

                    {/* Footer / Redeem Action */}
                    <View style={styles.couponFooter}>
                      <View style={styles.couponCostPill}>
                        <Coins size={13} color="#D97706" strokeWidth={2.2} />
                        <Text style={styles.couponCostText}>
                          {coupon.costPts} coins
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.redeemButton,
                          isClaimed && styles.redeemButtonClaimed,
                          !isClaimed && !canAfford && styles.redeemButtonDisabled,
                        ]}
                        onPress={() => handleRedeemCoupon(coupon)}
                        activeOpacity={0.82}
                      >
                        {isClaimed ? (
                          <View style={styles.redeemButtonInner}>
                            <Check size={13} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.redeemButtonTextClaimed}>
                              Code Unlocked
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.redeemButtonText}>
                            {canAfford ? "Unlock Voucher" : "Need Karma Coins"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL: Coupon Voucher Details */}
      <Modal
        visible={!!activeModalCoupon}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModalCoupon(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {activeModalCoupon && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderBadge}>
                    <Sparkles size={13} color="#2EA86E" strokeWidth={2.2} />
                    <Text style={styles.modalHeaderBadgeText}>
                      ACTIVE VOUCHER
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveModalCoupon(null)}
                    style={styles.modalCloseBtn}
                  >
                    <X size={18} color="#7A9082" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalBrand}>
                  {activeModalCoupon.brand}
                </Text>
                <Text style={styles.modalPerk}>
                  {activeModalCoupon.perk}
                </Text>
                <Text style={styles.modalTitle}>
                  {activeModalCoupon.title}
                </Text>

                {/* Promo Code Box */}
                <View style={styles.promoCodeBox}>
                  <Text style={styles.promoCodeLabel}>VOUCHER CODE</Text>
                  <Text style={styles.promoCodeText}>
                    {activeModalCoupon.code}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(activeModalCoupon.code)}
                    activeOpacity={0.8}
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={14} color="#2EA86E" strokeWidth={2.4} />
                        <Text style={styles.copyButtonTextCopied}>
                          Copied to Clipboard!
                        </Text>
                      </>
                    ) : (
                      <>
                        <Copy size={14} color="#183222" strokeWidth={2} />
                        <Text style={styles.copyButtonText}>Copy Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Terms & Validity */}
                <View style={styles.modalInfoBox}>
                  <View style={styles.modalInfoRow}>
                    <Clock size={13} color="#7A9082" strokeWidth={2} />
                    <Text style={styles.modalInfoText}>
                      {activeModalCoupon.expiresIn}
                    </Text>
                  </View>
                  <Text style={styles.modalTerms}>
                    {activeModalCoupon.terms}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalDoneButton}
                  onPress={() => setActiveModalCoupon(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalDoneButtonText}>Close Voucher</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: Offset Donation Certificate */}
      <Modal
        visible={!!activeOffsetDonation}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveOffsetDonation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {activeOffsetDonation && (
              <>
                <View style={styles.donationCelebrationIcon}>
                  <TreePine size={32} color="#2EA86E" strokeWidth={2.2} />
                </View>

                <Text style={styles.donationTitle}>Donation Confirmed!</Text>
                <Text style={styles.donationSubtitle}>
                  You just offset {activeOffsetDonation.impactKg} kg of CO₂e
                  using {activeOffsetDonation.costPts} Karma Coins.
                </Text>

                <View style={styles.donationCertCard}>
                  <Text style={styles.certLabel}>OFFICIAL CERTIFICATE</Text>
                  <Text style={styles.certProject}>
                    {activeOffsetDonation.title}
                  </Text>
                  <Text style={styles.certLoc}>
                    {activeOffsetDonation.location}
                  </Text>
                  <View style={styles.certDivider} />
                  <View style={styles.certRow}>
                    <Text style={styles.certKey}>Verified By</Text>
                    <Text style={styles.certVal}>
                      {activeOffsetDonation.certifier}
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={styles.certKey}>Impact Credit</Text>
                    <Text style={[styles.certVal, { color: "#2EA86E" }]}>
                      -{activeOffsetDonation.impactKg} kg CO₂e
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={styles.certKey}>Certificate Ref</Text>
                    <Text style={styles.certVal}>#CL-2026-OFFSET</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalDoneButton}
                  onPress={() => setActiveOffsetDonation(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalDoneButtonText}>
                    Great, Return to Offers
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_500Medium",
    color: "#2EA86E",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_500Medium",
    color: "#1B7A4E",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#6B7D72",
    marginTop: 2,
    lineHeight: 18,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.25)",
    boxShadow: "0px 8px 16px rgba(13,36,24,0.25)",
    elevation: 6,
  },
  heroGlowOrb: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(94,234,212,0.12)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  coinsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinsPillText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#5EEAD4",
    letterSpacing: 0.8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#FDE68A",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 18,
  },
  balanceNumber: {
    fontSize: 48,
    fontFamily: "Nunito_800ExtraBold",
    color: "#FFFFFF",
    lineHeight: 52,
  },
  balanceMeta: {
    justifyContent: "center",
  },
  balanceUnit: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#5EEAD4",
  },
  balanceSubtext: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 10,
  },
  heroStatItem: {
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: "Nunito_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  toast: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  toastText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  activeWalletCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
  },
  activeWalletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  activeWalletTitle: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  walletTicket: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    width: 220,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletTicketLeft: {
    flex: 1,
    marginRight: 8,
  },
  walletTicketPerk: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#2EA86E",
  },
  walletTicketBrand: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#6B7D72",
  },
  walletTicketRight: {
    alignItems: "flex-end",
  },
  walletTicketCode: {
    fontSize: 10,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#183222",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  walletTicketTap: {
    fontSize: 9,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#0D1811",
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.18)",
  },
  categoryPillActive: {
    backgroundColor: "#2EA86E",
    borderColor: "#2EA86E",
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#4B5563",
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#6B7D72",
    marginTop: 2,
  },
  offsetsGrid: {
    gap: 12,
  },
  offsetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  offsetCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  offsetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  offsetCertifier: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#2EA86E",
    letterSpacing: 0.4,
  },
  offsetTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
    lineHeight: 18,
  },
  offsetImpactPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  offsetImpactText: {
    fontSize: 12,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  offsetDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 17,
    marginBottom: 12,
  },
  offsetCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  offsetCostWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  offsetCostText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  offsetDonateButton: {
    backgroundColor: "#2EA86E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  offsetDonateButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  offsetDonateButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  couponsGrid: {
    gap: 14,
  },
  couponCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
    elevation: 2,
  },
  couponCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeGovt: {
    backgroundColor: "rgba(4,120,87,0.1)",
  },
  categoryBadgeEco: {
    backgroundColor: "rgba(46,168,110,0.1)",
  },
  categoryBadgeText: {
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
    color: "#047857",
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#2EA86E",
  },
  couponBody: {
    marginBottom: 12,
  },
  couponBrand: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
    marginBottom: 2,
  },
  couponPerk: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    lineHeight: 22,
  },
  couponTitle: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
    marginTop: 2,
  },
  couponDescription: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 16,
    marginTop: 4,
  },
  impactHighlightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  impactHighlightText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
  },
  couponFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  couponCostPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  couponCostText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#B45309",
  },
  redeemButton: {
    backgroundColor: "#0D1811",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  redeemButtonClaimed: {
    backgroundColor: "#059669",
  },
  redeemButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  redeemButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  redeemButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  redeemButtonTextClaimed: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0px 10px 20px rgba(0,0,0,0.25)",
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46,168,110,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modalHeaderBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
    letterSpacing: 0.6,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBrand: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
  },
  modalPerk: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    marginTop: 2,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: "#183222",
    marginTop: 2,
    marginBottom: 16,
  },
  promoCodeBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2EA86E",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  promoCodeLabel: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
    letterSpacing: 0.8,
  },
  promoCodeText: {
    fontSize: 20,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    letterSpacing: 1.5,
    marginVertical: 8,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
  },
  copyButtonText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  copyButtonTextCopied: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
  },
  modalInfoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  modalInfoText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#4B5563",
  },
  modalTerms: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#6B7280",
    lineHeight: 15,
  },
  modalDoneButton: {
    backgroundColor: "#0D1811",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalDoneButtonText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  donationCelebrationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  donationTitle: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    textAlign: "center",
  },
  donationSubtitle: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  donationCertCard: {
    backgroundColor: "#F8FAF8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
    padding: 14,
    marginBottom: 18,
  },
  certLabel: {
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
    color: "#059669",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  certProject: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  certLoc: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#7A9082",
    marginBottom: 8,
  },
  certDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginBottom: 8,
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  certKey: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#6B7280",
  },
  certVal: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
});
