# REFACTOR & OPTIMIZATION SUGGESTIONS — VivaMarket

Tài liệu ngắn gọn, ưu tiên hành động để cải thiện hiệu năng, chi phí realtime, và bảo mật.

## Tổng quan (những gì tôi đã tìm)
- Ứng dụng dùng nhiều `onSnapshot` realtime (11 collections) khởi lập ở `listenAllData`.
- Có bộ tài liệu nội bộ về "listener optimization" — sẵn tư liệu để triển khai.
- Backup full DB lên JSONBin từ client (master key và BIN_ID xuất hiện trong mã nguồn).
- Nhiều console.log, nhiều listener cho các role (admin có nhiều listener toàn bộ collections).
- Expo push tokens (`expoToken`) được lưu/ cập nhật từ client.

---

## Vấn đề chính & đề xuất (ưu tiên)

1) Bảo mật: **loại bỏ secrets khỏi mã nguồn** (Cao)
   - Xóa `MASTER_KEY`, `BIN_ID`, X-Master-Key khỏi file client. Chuyển sang `env` (CI secrets) hoặc backend server.
   - Di chuyển backup (PUT JSONBin) sang Cloud Function / server endpoint có secret bảo vệ.

2) Realtime listener & chi phí: **giảm và phân tách listeners theo role** (Cao)
   - Triển khai pattern: `listenGuestData()`, `listenUserData()`, `listenShopOwnerData()`, `listenShipperData()`, `listenAdminData()` (repo đã có docs về việc này).
   - Chỉ listen collection cần thiết theo role; huỷ unsubscribe ngay khi logout/role change.
   - Dùng queries có `where`/`limit`/`orderBy` để giảm payload.

3) UI perf & re-renders: **selective subscriptions + memoization** (Medium)
   - Sử dụng selector granular với `zustand` để tránh cập nhật toàn bộ store khi 1 collection thay đổi.
   - Dùng `React.memo`, `useMemo`, `useCallback` cho component danh sách lớn.
   - Thay các `map` render lớn bằng `FlatList`/`SectionList` (RN) với `keyExtractor` + `getItemLayout`.

4) Throttling / Debounce xử lý snapshot (Medium)
   - Nếu onSnapshot nhận nhiều event trong 1s, throttle updates -> batch xử lý state để tránh render quá nhiều.

5) Backup & heavy ops: **đưa ra backend** (High)
   - Không backup full DB từ client; dùng scheduled Cloud Function (cron) hoặc admin-only endpoint.
   - Các tính toán nặng (tổng tài chính, báo cáo) nên chạy ở server và lưu kết quả, tránh tính client-side trên toàn bộ collection.

6) Firestore rules & indexing (High)
   - Kiểm tra security rules, giới hạn quyền đọc/ghi theo role.
   - Add composite indexes cho các query phức tạp (orderBy + where) để giảm read cost.

7) Logging & debugging (Low)
   - Loại bỏ hoặc chuyển `console.log` nhạy cảm khỏi production builds.

8) Dependency & vuln audit (Medium)
   - Chạy `npm audit` và nâng cấp dependencies có vulnerability; kiểm tra size của bundle web.

9) Push notifications flow (Medium)
   - Xác thực token update flow; tránh update expoToken quá thường xuyên.

10) UX edge-cases & resilience (Medium)
   - Graceful fallback khi listeners bị lỗi; retry with backoff.
   - Thêm loading / empty states rõ ràng để tránh unnecessary renders.

---

## Quick wins (triển khai trong 1-2 ngày)
- Move `MASTER_KEY` and `BIN_ID` out of repo (replace with env vars). Stop client direct backup.
- Implement role-based listener split (use existing docs in repo). Start with Guest vs Admin.
- Remove noisy `console.log` in `listenAllData` and login flows.

## Medium-term (1-2 weeks)
- Throttle snapshot updates; implement granular selectors in `zustand`.
- Move heavy aggregations to Cloud Functions and add caching for reports.
- Audit Firestore rules and add missing indexes.

## Long-term (month+)
- Re-architect real-time needs: consider streamlining which collections actually need realtime sync; use polling or delta sync for low-priority data.
- Add telemetry/profiling to measure renders and network usage in production (Sentry / React Native Perf).

---

Nếu bạn đồng ý, tôi sẽ: (chọn 1)
- A: Tạo checklist chi tiết và PR patches an toàn (remove secrets, move backup calls to a server stub).  
- B: Tạo step-by-step plan để triển khai listener split (code snippets + tests).  
- C: Chỉ cung cấp tài liệu chi tiết (kịch bản thay đổi, file list, và nơi sửa đổi) để bạn hoặc team làm.

Chọn A/B/C hoặc gợi ý khác để tôi tiếp tục.
