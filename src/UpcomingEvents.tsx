import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { type Listing, localToday, validDate } from "./domain";
import { ListingCard } from "./App";

export function UpcomingEvents({ listings }: { listings: Listing[] }) {
  const heading = useId();
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ start: true, end: false });
  const today = localToday();
  const events = listings
    .filter(
      (item) =>
        item.type === "event" &&
        validDate(item.eventStartDate) &&
        (item.eventEndDate || item.eventStartDate) >= today,
    )
    .sort(
      (a, b) =>
        a.eventStartDate.localeCompare(b.eventStartDate) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 6);
  const eventIds = events.map((item) => item.id).join(",");
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () =>
      setPosition({
        start: element.scrollLeft < 2,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    element.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(element);
    update();
    return () => {
      element.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, [eventIds]);
  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const card = element.firstElementChild;
    const width = card
      ? card.getBoundingClientRect().width + 24
      : element.clientWidth;
    element.scrollBy({
      left: width * direction,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section
      className="upcoming-section feature-theme feature-theme-event"
      aria-labelledby={heading}
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <CalendarDays size={16} /> MAKE A DATE WITH YOUR COMMUNITY
            </span>
            <h2 id={heading}>Coming up locally</h2>
            <p>Something to look forward to. Discover what’s happening next.</p>
          </div>
          <Link to="/events" className="arrow-link">
            View all events <ArrowRight size={18} />
          </Link>
        </div>
        {events.length ? (
          <div
            className="events-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="Upcoming community events"
          >
            <div className="carousel-controls">
              <span>Upcoming & ongoing · earliest first</span>
              <div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Previous events"
                  aria-controls={trackId}
                  disabled={position.start}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Next events"
                  aria-controls={trackId}
                  disabled={position.end}
                  onClick={() => move(1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div
              id={trackId}
              className="events-track"
              ref={track}
              tabIndex={0}
              aria-label="Event cards; use left and right arrow keys to browse"
              role="group"
              onKeyDown={(event) => {
                if (
                  event.target !== event.currentTarget ||
                  !["ArrowLeft", "ArrowRight"].includes(event.key)
                )
                  return;
                event.preventDefault();
                move(event.key === "ArrowLeft" ? -1 : 1);
              }}
            >
              {events.map((item, index) => (
                <div
                  key={item.id}
                  className="event-slide"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${events.length}`}
                >
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="upcoming-empty">
            <CalendarDays size={38} strokeWidth={1.3} />
            <div>
              <h3>Good things are on the way.</h3>
              <p>
                No upcoming events have been published yet. Check back soon for
                local gatherings and special occasions.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
