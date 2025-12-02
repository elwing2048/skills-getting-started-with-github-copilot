document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants HTML
        let participantsHTML = "";
        if (participants.length > 0) {
          participantsHTML += `<div class="participants"><h5>Participants</h5><ul class="participants-list">`;
          participantsHTML += participants
            .map((p) => {
              // Determine display name (support string, object with name/email)
              let displayName = "";
              if (typeof p === "string") {
                displayName = p;
              } else if (p && (p.name || p.email)) {
                displayName = p.name || p.email;
              } else {
                displayName = String(p);
              }

              // Create initials for avatar
              let initials = displayName;
              if (initials.includes("@")) {
                initials = initials.split("@")[0];
              }
              initials = initials
                .split(/[\s._-]+/)
                .map((s) => s[0] || "")
                .join("")
                .slice(0, 2)
                .toUpperCase();

              // Determine the email we can use to unregister. If p is an object, prefer p.email
              const participantEmail = typeof p === 'string' ? p : (p && p.email) ? p.email : displayName;;

              return `
                <li class="participant">
                  <span class="participant-avatar" aria-hidden="true">${initials}</span>
                  <span class="participant-name">${displayName}</span>
                  <button class="participant-delete" data-activity="${name}" data-email="${participantEmail}" aria-label="Remove participant">✖</button>
                </li>`;
            })
            .join("");
          participantsHTML += `</ul></div>`;
        } else {
          participantsHTML = `<p class="no-participants">No participants yet. Be the first to sign up!</p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // Keep 'message' base class so sizing/padding are preserved
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities to show new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Event delegation for delete participant buttons
  activitiesList.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest('.participant-delete');
    if (!deleteBtn) return;

    const activityName = deleteBtn.dataset.activity;
    const email = deleteBtn.dataset.email;
    if (!activityName || !email) return;

    // Optional: basic confirmation
    const confirmed = confirm(`Are you sure you want to unregister ${email} from ${activityName}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        // Refresh activities to reflect removal
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to unregister participant';
        messageDiv.className = 'message error';
      }
    } catch (error) {
      messageDiv.textContent = 'Failed to unregister participant';
      messageDiv.className = 'message error';
      console.error('Error unregistering participant:', error);
    }

    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
  });
});
