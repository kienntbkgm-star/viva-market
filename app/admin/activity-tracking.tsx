// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ActivityTrackingScreen() {
  const router = useRouter();
  const { users, onlineLog, foodOrders } = useAppStore();
  const [activeTab, setActiveTab] = useState('shippers'); // 'shippers' | 'all-users'
  const [dateRange, setDateRange] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month'

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const ONLINE_TIMEOUT = 5 * 60 * 1000; // 5 phút

  // ==========================================
  // HELPER: Tính date range
  // ==========================================
  const getDateRange = (range) => {
    const currentDate = new Date();
    let startDate, endDate = currentDate.toISOString().slice(0, 10);

    if (range === 'today') {
      startDate = today;
    } else if (range === 'yesterday') {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().slice(0, 10);
      endDate = startDate;
    } else if (range === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
      startDate = weekStart.toISOString().slice(0, 10);
    } else if (range === 'month') {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startDate = monthStart.toISOString().slice(0, 10);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange(dateRange);

  // ==========================================
  // SHIPPER ANALYTICS
  // ==========================================
  
  const shipperStats = useMemo(() => {
    const shippers = users.filter(u => u.role === 'shipper');
    
    return shippers.map(shipper => {
      const userLog = onlineLog.find(log => log.id === shipper.id.toString());
      
      // Check online realtime (luôn check hôm nay)
      const isReallyOnline = userLog?.isOnline && (now - userLog.lastOnlineTimestamp < ONLINE_TIMEOUT);
      
      // Tính tổng phút online trong date range
      let totalMinutes = 0;
      let totalSessions = 0;
      let crashCount = 0;
      let totalOrders = 0;
      
      if (userLog?.log) {
        userLog.log.forEach(entry => {
          const [timestamp, duration] = entry.split('-').map(Number);
          const logDate = new Date(timestamp).toISOString().slice(0, 10);
          
          if (logDate >= startDate && logDate <= endDate) {
            totalMinutes += Math.floor(duration / 60);
            totalSessions++;
            if (duration === 0) crashCount++; // Crash detected
          }
        });
      }
      
      // Đếm số đơn giao trong date range
      totalOrders = foodOrders.filter(order => {
        if (order.shipperId !== shipper.id) return false;
        const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
        return orderDate >= startDate && orderDate <= endDate;
      }).length;
      
      const todayHours = (totalMinutes / 60).toFixed(1);
      
      // Tính hiệu suất
      const efficiency = totalMinutes > 0 
        ? (totalOrders / (totalMinutes / 60)).toFixed(1) 
        : '0.0';
      
      // Last seen
      let lastSeenText = 'Chưa online';
      if (userLog?.lastOnlineTimestamp) {
        const diffMinutes = Math.floor((now - userLog.lastOnlineTimestamp) / (1000 * 60));
        if (diffMinutes < 1) lastSeenText = 'Vừa xong';
        else if (diffMinutes < 60) lastSeenText = `${diffMinutes}m`;
        else if (diffMinutes < 1440) lastSeenText = `${Math.floor(diffMinutes / 60)}h`;
        else lastSeenText = `${Math.floor(diffMinutes / 1440)}d`;
      }
      
      // Offline warning
      const offlineWarning = shipper.isReady && !isReallyOnline && userLog?.lastOnlineTimestamp
        ? Math.floor((now - userLog.lastOnlineTimestamp) / (1000 * 60))
        : null;
      
      return {
        id: shipper.id,
        name: shipper.name,
        role: 'shipper',
        isReady: shipper.isReady || false,
        isOnline: isReallyOnline,
        lastSeenText,
        todayHours,
        todaySessions: totalSessions,
        todayOrders: totalOrders,
        efficiency,
        crashCount,
        offlineWarning
      };
    });
  }, [users, onlineLog, foodOrders, startDate, endDate]);

  // ==========================================
  // ALL USERS ANALYTICS
  // ==========================================

  const allUsersStats = useMemo(() => {
    return users
      .filter(u => u.role !== 'admin') // Loại bỏ admin
      .map(user => {
      const userLog = onlineLog.find(log => log.id === user.id.toString());
      
      const isReallyOnline = userLog?.isOnline && (now - userLog.lastOnlineTimestamp < ONLINE_TIMEOUT);
      
      let totalMinutes = 0;
      let totalSessions = 0;
      
      if (userLog?.log) {
        userLog.log.forEach(entry => {
          const [timestamp, duration] = entry.split('-').map(Number);
          const logDate = new Date(timestamp).toISOString().slice(0, 10);
          
          if (logDate >= startDate && logDate <= endDate) {
            totalMinutes += Math.floor(duration / 60);
            totalSessions++;
          }
        });
      }
      
      const todayHours = (totalMinutes / 60).toFixed(1);
      
      // Activity score: 0-100
      let score = 0;
      if (isReallyOnline) score += 30;
      if (totalSessions >= 3) score += 30;
      if (totalMinutes >= 120) score += 40;
      else if (totalMinutes >= 60) score += 25;
      else if (totalMinutes > 0) score += 10;
      
      let lastSeenText = 'Chưa online';
      if (userLog?.lastOnlineTimestamp) {
        const diffMinutes = Math.floor((now - userLog.lastOnlineTimestamp) / (1000 * 60));
        if (diffMinutes < 1) lastSeenText = 'Vừa xong';
        else if (diffMinutes < 60) lastSeenText = `${diffMinutes}m`;
        else if (diffMinutes < 1440) lastSeenText = `${Math.floor(diffMinutes / 60)}h`;
        else lastSeenText = `${Math.floor(diffMinutes / 1440)}d`;
      }
      
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        isOnline: isReallyOnline,
        lastSeenText,
        todayHours,
        todaySessions: totalSessions,
        score
      };
    });
  }, [users, onlineLog, startDate, endDate]);

  // Tổng hợp Shipper
  const shipperSummary = useMemo(() => {
    const readyAndOnline = shipperStats.filter(s => s.isReady && s.isOnline).length;
    const totalReady = shipperStats.filter(s => s.isReady).length;
    const totalOrders = shipperStats.reduce((sum, s) => sum + s.todayOrders, 0);
    const hasCrash = shipperStats.filter(s => s.crashCount > 0).length;
    const offlineReady = shipperStats.filter(s => s.offlineWarning !== null).length;
    const totalOnline = shipperStats.filter(s => s.isOnline).length;
    const totalMinutes = shipperStats.reduce((sum, s) => sum + Math.floor(parseFloat(s.todayHours) * 60), 0);
    const avgOrderPerHour = totalMinutes > 0 ? (totalOrders / (totalMinutes / 60)).toFixed(1) : '0.0';
    
    return {
      readyAndOnline,
      totalReady,
      totalOrders,
      hasCrash,
      offlineReady,
      totalOnline,
      totalMinutes,
      avgOrderPerHour
    };
  }, [shipperStats]);

  const usersSummary = useMemo(() => {
    const nonAdminUsers = allUsersStats;
    const totalOnline = nonAdminUsers.filter(u => u.isOnline).length;
    const totalSessions = nonAdminUsers.reduce((sum, u) => sum + u.todaySessions, 0);
    const totalMinutes = nonAdminUsers.reduce((sum, u) => sum + Math.floor(parseFloat(u.todayHours) * 60), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.floor(totalMinutes / totalSessions) : 0;
    
    // Phân loại by role
    const byRole = {};
    nonAdminUsers.forEach(u => {
      if (!byRole[u.role]) byRole[u.role] = { total: 0, online: 0 };
      byRole[u.role].total++;
      if (u.isOnline) byRole[u.role].online++;
    });
    
    // Crash detection
    const hasCrash = nonAdminUsers.filter(u => {
      const userLog = onlineLog.find(log => log.id === u.id.toString());
      return userLog?.log?.some(entry => entry.split('-')[1] === '0') || false;
    }).length;
    
    return {
      totalOnline,
      totalSessions,
      totalMinutes,
      avgSessionDuration,
      byRole,
      hasCrash,
      totalUsers: nonAdminUsers.length
    };
  }, [allUsersStats, onlineLog]);

  const sortedShippers = useMemo(() => {
    return [...shipperStats].sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if (a.isReady !== b.isReady) return a.isReady ? -1 : 1;
      return parseFloat(b.todayHours) - parseFloat(a.todayHours);
    });
  }, [shipperStats]);

  const sortedUsers = useMemo(() => {
    return [...allUsersStats].sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return b.score - a.score;
    });
  }, [allUsersStats]);

  return (
    <SafeAreaView style={GlobalStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê Hoạt động</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shippers' && styles.activeTab]}
          onPress={() => setActiveTab('shippers')}
        >
          <Text style={[styles.tabText, activeTab === 'shippers' && styles.activeTabText]}>
            Shippers ({shipperStats.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all-users' && styles.activeTab]}
          onPress={() => setActiveTab('all-users')}
        >
          <Text style={[styles.tabText, activeTab === 'all-users' && styles.activeTabText]}>
            All Users ({allUsersStats.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      <View style={styles.dateFilterContainer}>
        {[
          { label: 'Hôm nay', value: 'today' },
          { label: 'Hôm qua', value: 'yesterday' },
          { label: 'Tuần', value: 'week' },
          { label: 'Tháng', value: 'month' }
        ].map(item => (
          <TouchableOpacity
            key={item.value}
            style={[styles.dateFilterBtn, dateRange === item.value && styles.dateFilterBtnActive]}
            onPress={() => setDateRange(item.value)}
          >
            <Text style={[styles.dateFilterText, dateRange === item.value && styles.dateFilterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {activeTab === 'shippers' ? (
          <>
            {/* Shipper Summary Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statsCard, { borderLeftColor: '#27AE60' }]}>
                <Text style={styles.statsValue}>{shipperSummary.readyAndOnline}/{shipperSummary.totalReady}</Text>
                <Text style={styles.statsLabel}>Ready & Online</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: '#3498DB' }]}>
                <Text style={styles.statsValue}>{shipperSummary.totalOrders}</Text>
                <Text style={styles.statsLabel}>Đơn hôm nay</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statsCard, { borderLeftColor: '#9B59B6' }]}>
                <Text style={styles.statsValue}>{Math.floor(shipperSummary.totalMinutes / 60)}</Text>
                <Text style={styles.statsLabel}>Tổng giờ</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: '#E67E22' }]}>
                <Text style={styles.statsValue}>{shipperSummary.avgOrderPerHour}</Text>
                <Text style={styles.statsLabel}>Đơn/h</Text>
              </View>
            </View>

            {/* Shipper Status Distribution */}
            <Text style={styles.sectionTitle}>Phân bố trạng thái</Text>
            
            <View style={styles.roleCard}>
              <View style={styles.roleHeader}>
                <Text style={styles.roleName}>Online</Text>
                <Text style={styles.roleCount}>{shipperSummary.totalOnline}/{shipperStats.length} online</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(shipperSummary.totalOnline / shipperStats.length) * 100}%` }
                  ]}
                />
              </View>
            </View>

            <View style={styles.roleCard}>
              <View style={styles.roleHeader}>
                <Text style={styles.roleName}>Ready</Text>
                <Text style={styles.roleCount}>{shipperSummary.totalReady}/{shipperStats.length} ready</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(shipperSummary.totalReady / shipperStats.length) * 100}%` }
                  ]}
                />
              </View>
            </View>

            {/* Warnings */}
            {shipperSummary.hasCrash > 0 && (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.warningTitle}>Crash Detection</Text>
                  <Text style={styles.warningDesc}>{shipperSummary.hasCrash} shippers có dấu hiệu crash</Text>
                </View>
              </View>
            )}

            {shipperSummary.offlineReady > 0 && (
              <View style={styles.warningCard}>
                <Ionicons name="warning" size={20} color="#F39C12" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.warningTitle}>Offline Warning</Text>
                  <Text style={styles.warningDesc}>{shipperSummary.offlineReady} shippers ready nhưng offline lâu</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* All Users Summary Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statsCard, { borderLeftColor: '#27AE60' }]}>
                <Text style={styles.statsValue}>{usersSummary.totalOnline}</Text>
                <Text style={styles.statsLabel}>Đang Online</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: '#3498DB' }]}>
                <Text style={styles.statsValue}>{usersSummary.totalSessions}</Text>
                <Text style={styles.statsLabel}>Sessions</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statsCard, { borderLeftColor: '#9B59B6' }]}>
                <Text style={styles.statsValue}>{Math.floor(usersSummary.totalMinutes / 60)}</Text>
                <Text style={styles.statsLabel}>Tổng giờ</Text>
              </View>
              <View style={[styles.statsCard, { borderLeftColor: '#E67E22' }]}>
                <Text style={styles.statsValue}>{usersSummary.avgSessionDuration}m</Text>
                <Text style={styles.statsLabel}>Avg session</Text>
              </View>
            </View>

            {/* Users by Role */}
            <Text style={styles.sectionTitle}>Theo loại tài khoản</Text>
            {Object.entries(usersSummary.byRole).map(([role, data]) => (
              <View key={role} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleName}>{role}</Text>
                  <Text style={styles.roleCount}>{data.online}/{data.total} online</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(data.online / data.total) * 100}%` }
                    ]}
                  />
                </View>
              </View>
            ))}

            {usersSummary.hasCrash > 0 && (
              <View style={styles.crashWarningCard}>
                <Ionicons name="warning" size={20} color="#E74C3C" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.crashWarningTitle}>Phát hiện Crash</Text>
                  <Text style={styles.crashWarningDesc}>{usersSummary.hasCrash} users có dấu hiệu crash hôm nay</Text>
                </View>
              </View>
            )}
          </>
        )}

        {(activeTab === 'shippers' && shipperStats.length === 0) || (activeTab === 'all-users' && allUsersStats.length === 0) ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    gap: 10
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: COLORS.primary
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  activeTabText: { color: COLORS.primary },

  // Date Filter
  dateFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  dateFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  dateFilterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  dateFilterText: { fontSize: 12, fontWeight: '600', color: '#666' },
  dateFilterTextActive: { color: '#fff' },
  
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    borderLeftWidth: 5
  },
  statsValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statsLabel: { fontSize: 12, color: '#999', marginTop: 5 },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  
  // Shipper Card
  shipperCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 2
  },
  
  shipperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  
  shipperNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  shipperName: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },
  
  readyBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 5
  },
  readyBadgeText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold' },
  
  crashBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 5
  },
  crashBadgeText: { fontSize: 10, color: '#E74C3C', fontWeight: 'bold' },
  
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8
  },
  warningText: { fontSize: 12, color: '#F39C12', fontWeight: '500' },
  
  lastSeen: { fontSize: 11, color: '#999' },
  lastSeenUser: { fontSize: 11, color: '#999', textAlign: 'right' },
  
  shipperStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  
  userStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  
  // User Card
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 2
  },
  
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  
  userNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333' },
  userRole: { fontSize: 11, color: '#999', marginTop: 2 },
  
  scoreBox: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center'
  },
  scoreValue: { fontSize: 16, fontWeight: 'bold' },
  
  // Role Card
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 2
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  roleName: { fontSize: 14, fontWeight: '600', color: '#333', textTransform: 'capitalize' },
  roleCount: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold' },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4
  },
  
  crashWarningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C'
  },
  crashWarningTitle: { fontSize: 14, fontWeight: 'bold', color: '#E74C3C' },
  crashWarningDesc: { fontSize: 12, color: '#C62828', marginTop: 3 },
  
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10
  }
});
