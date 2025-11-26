# Rate Limiting Test Guide

## 🎯 Test Objective
Verify that the client-side rate limiting (10 requests per minute) works correctly and provides appropriate user feedback.

## 🚀 Dev Server
- **Status**: ✅ Running
- **URL**: http://localhost:3001/
- **Started**: Ready for testing

## 📋 Test Scenarios

### Test 1: Trigger Rate Limit
**Goal**: Verify rate limiting kicks in after 10 requests

**Steps**:
1. Open the app at http://localhost:3001/
2. Log in to your account
3. Navigate to any module with AI Assistant (Dashboard, CRM, Marketing, etc.)
4. Open the AI Assistant panel
5. **Rapidly send 10+ messages** (type quickly and hit Enter)
   - Message examples: "test 1", "test 2", "test 3", etc.
   - Send them as fast as possible

**Expected Results**:
- ✅ First 10 messages should be sent successfully
- ✅ 11th message triggers rate limit error
- ✅ Error message appears in chat history with countdown timer
- ✅ Orange banner appears at top with ⏱️ icon
- ✅ Banner text: "Rate Limit Exceeded"
- ✅ Message shows: "You've sent 10 requests in the last minute. Please wait X seconds before trying again."

**Screenshot Checklist**:
- [ ] Orange rate limit banner visible
- [ ] Countdown timer showing remaining seconds
- [ ] Error message in chat history

---

### Test 2: Auto-Clear After Cooldown
**Goal**: Verify error banner automatically disappears after cooldown

**Steps**:
1. After triggering rate limit (from Test 1)
2. **Wait for the countdown to reach 0**
3. Observe the UI (don't click anything)

**Expected Results**:
- ✅ Orange banner disappears automatically when countdown reaches 0
- ✅ Chat input becomes usable again
- ✅ No manual dismissal required

**Screenshot Checklist**:
- [ ] Banner disappears on its own
- [ ] Chat interface returns to normal state

---

### Test 3: Requests Work After Cooldown
**Goal**: Verify users can send messages again after waiting

**Steps**:
1. After cooldown period expires (from Test 2)
2. Wait an additional 5-10 seconds
3. Send a new message: "This should work now"

**Expected Results**:
- ✅ Message sends successfully
- ✅ No rate limit error appears
- ✅ AI responds normally
- ✅ Request counter resets

---

### Test 4: Rate Limit Across Modules
**Goal**: Verify rate limiting is per-module (independent counters)

**Steps**:
1. Trigger rate limit in Dashboard AI Assistant (10 messages)
2. Switch to CRM module
3. Try sending messages in CRM AI Assistant

**Expected Results**:
- ✅ Dashboard shows rate limit error
- ✅ CRM Assistant works normally (separate counter)
- ✅ Each module tracks its own rate limit independently

---

### Test 5: Rate Limit + AI Usage Limit Interaction
**Goal**: Verify both systems work together without conflicts

**Steps**:
1. Check your current AI usage (should show X/20, X/50, or X/200)
2. Trigger rate limit (10 rapid messages)
3. Wait for cooldown
4. Continue using AI until hitting usage limit

**Expected Results**:
- ✅ Rate limit shows orange banner with ⏱️ icon
- ✅ AI usage limit shows yellow banner with ⚠️ icon
- ✅ Both banners can appear simultaneously if both limits hit
- ✅ Rate limit is temporary (60 seconds), usage limit persists
- ✅ After rate limit cooldown, usage limit still enforced

---

### Test 6: Edge Case - Exactly 10 Requests
**Goal**: Verify the boundary condition

**Steps**:
1. Send exactly 10 messages in quick succession
2. Wait 5 seconds
3. Send 11th message

**Expected Results**:
- ✅ First 10 messages succeed
- ✅ 11th message is blocked (rate limited)
- ✅ Error shows correct countdown

---

### Test 7: Slow Requests Don't Trigger Limit
**Goal**: Verify normal usage doesn't hit rate limit

**Steps**:
1. Send 10 messages with 10-second gaps between each
2. All messages should process normally

**Expected Results**:
- ✅ All 10 messages send successfully
- ✅ No rate limit error appears
- ✅ Old timestamps expire from the 60-second window

---

## 🐛 Known Issues to Watch For

1. **Timestamp Not Clearing**: If old timestamps don't expire, rate limit may persist
2. **Banner Doesn't Disappear**: Auto-clear setTimeout might not be working
3. **Countdown Inaccurate**: Remaining time calculation may be off
4. **Multiple Modules Share Counter**: Should be independent per module
5. **Rate Limit After Page Refresh**: Counter should reset on component mount

---

## 📊 Test Results Template

| Test # | Scenario | Pass/Fail | Notes |
|--------|----------|-----------|-------|
| 1 | Trigger rate limit | ⬜ | |
| 2 | Auto-clear after cooldown | ⬜ | |
| 3 | Requests work after cooldown | ⬜ | |
| 4 | Rate limit across modules | ⬜ | |
| 5 | Rate + Usage limit interaction | ⬜ | |
| 6 | Exactly 10 requests | ⬜ | |
| 7 | Slow requests don't trigger | ⬜ | |

---

## 🔍 Code Validation Checklist

Open DevTools Console (F12) and check:
- [ ] No JavaScript errors when rate limit triggers
- [ ] `requestTimestamps` array grows to length 10
- [ ] Old timestamps are filtered out after 60 seconds
- [ ] `rateLimitError` state updates correctly
- [ ] setTimeout clears error after countdown

---

## 📝 Implementation Details

**Rate Limit Settings**:
- Window: 60 seconds (60000ms)
- Max Requests: 10
- Enforcement: Client-side (ModuleAssistant component)

**Key Functions**:
- `checkRateLimit()`: Filters old timestamps, checks count
- `recordRequest()`: Adds current timestamp
- `sendMessage()`: Enforces limit before API call

**UI Components**:
- Orange banner with ⏱️ icon
- Countdown timer in error message
- Auto-dismissing after cooldown
- Chat history error message

---

## ✅ Success Criteria

All tests should pass with:
1. Rate limit triggers at 11th request within 60 seconds
2. Error banner displays with accurate countdown
3. Banner auto-clears when cooldown expires
4. Users can send messages again after waiting
5. No JavaScript errors in console
6. Rate limiting doesn't interfere with AI usage tracking
7. Each module maintains independent rate limit counter

---

## 🚨 If Tests Fail

1. Check browser console for errors
2. Verify `requestTimestamps` array in React DevTools
3. Confirm `RATE_LIMIT_WINDOW` and `RATE_LIMIT_MAX_REQUESTS` constants
4. Test `checkRateLimit()` function logic
5. Verify `setTimeout` auto-clear is firing
6. Check that `recordRequest()` is called after successful check

---

## 📱 Manual Testing Instructions

Since automated UI testing isn't available, follow these steps:

1. **Open the app**: http://localhost:3001/
2. **Login** with your test account
3. **Navigate** to any module with AI Assistant
4. **Type and send rapidly**: "1" [Enter], "2" [Enter], "3" [Enter]... up to 15 times
5. **Observe** the orange banner appear after 10 requests
6. **Wait** for countdown to complete
7. **Verify** you can send messages again

---

## 🎥 Recommended: Screen Recording

Consider recording your screen while testing to capture:
- Rate limit trigger moment
- Banner appearance and countdown
- Auto-clear behavior
- Subsequent successful requests

This helps document the feature working correctly!
