using System.ComponentModel;

namespace TODO.Backend.API.Models
{
    public enum Priority : byte
    {
        [Description("None")]
        None = 0,
        [Description("Low")]
        Low = 1,
        [Description("Medium")]
        Medium = 2,
        [Description("High")]
        High = 3,
        [Description("Urgent")]
        Urgent = 4
    }
}
